import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { publicUserSelect, taskCardSelect } from "@/lib/selectors";
import { updateProjectSchema } from "@/lib/validations";

// GET /api/projects/[projectId] — full project with sections + task cards.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;
    const access = await requireProjectRole(me.id, projectId, "VIEWER");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        icon: true,
        isPersonal: true,
        ownerId: true,
        dueDate: true,
        createdAt: true,
        owner: { select: publicUserSelect },
        members: {
          select: {
            id: true,
            role: true,
            user: { select: publicUserSelect },
          },
        },
        sections: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            name: true,
            position: true,
            tasks: {
              where: { parentTaskId: null, deletedAt: null },
              orderBy: { position: "asc" },
              select: taskCardSelect,
            },
          },
        },
        milestones: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, color: true, dueDate: true, completed: true },
        },
        tags: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, color: true },
        },
      },
    });

    if (!project) throw new HttpError(404, "Project not found");

    // Worklog totals per task (one aggregation for the whole project).
    const worklogs = await prisma.timeLog.groupBy({
      by: ["taskId"],
      where: { task: { projectId } },
      _sum: { durationSeconds: true },
    });
    const worklogMap = new Map(
      worklogs.map((w) => [w.taskId, w._sum.durationSeconds ?? 0])
    );

    const sections = project.sections.map((s) => ({
      ...s,
      tasks: s.tasks.map((t) => ({
        ...t,
        worklogSeconds: worklogMap.get(t.id) ?? 0,
      })),
    }));

    return NextResponse.json({ ...project, sections, role: access.role });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PATCH /api/projects/[projectId] — rename / recolor (ADMIN+).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;

    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const d = parsed.data;

    // Favouriting is allowed for any member; editing project details requires
    // edit access (EDITOR+). Member management / deletion stay ADMIN/OWNER.
    const onlyFavorite =
      d.isFavorite !== undefined &&
      Object.keys(d).filter((k) => k !== "isFavorite").length === 0;
    await requireProjectRole(me.id, projectId, onlyFavorite ? "VIEWER" : "EDITOR");

    const data: Record<string, unknown> = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.description !== undefined) data.description = d.description || null;
    if (d.color !== undefined) data.color = d.color;
    if (d.icon !== undefined) data.icon = d.icon;
    if (d.isFavorite !== undefined) data.isFavorite = d.isFavorite;
    if (d.dueDate !== undefined) data.dueDate = d.dueDate ? new Date(d.dueDate) : null;

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
      select: { id: true, name: true, description: true, color: true, icon: true },
    });

    return NextResponse.json(project);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/projects/[projectId] — owner only; personal space can't be deleted.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;
    await requireProjectRole(me.id, projectId, "OWNER");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { isPersonal: true },
    });
    if (project?.isPersonal) {
      throw new HttpError(400, "Your Personal project can't be deleted");
    }

    await prisma.project.delete({ where: { id: projectId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
