import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse, HttpError } from "@/lib/authz";
import { createProjectSchema } from "@/lib/validations";
import { getRandomColor } from "@/lib/utils";
import { publicUserSelect } from "@/lib/selectors";
import type { ProjectRole } from "@prisma/client";

// GET /api/projects — projects the current user owns or is a member of,
// with progress (done/total), due date, favourite, and PM for the card grid.
export async function GET() {
  try {
    const me = await requireUser();

    const projects = await prisma.project.findMany({
      where: {
        OR: [{ ownerId: me.id }, { members: { some: { userId: me.id } } }],
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isPersonal: true,
        isFavorite: true,
        dueDate: true,
        ownerId: true,
        owner: { select: publicUserSelect },
        members: { where: { userId: me.id }, select: { role: true } },
        _count: { select: { members: true } },
      },
      orderBy: [{ isFavorite: "desc" }, { isPersonal: "desc" }, { updatedAt: "desc" }],
    });

    const ids = projects.map((p) => p.id);
    const baseWhere = { projectId: { in: ids }, deletedAt: null, parentTaskId: null };
    const [totals, dones] = await Promise.all([
      prisma.task.groupBy({ by: ["projectId"], where: baseWhere, _count: { _all: true } }),
      prisma.task.groupBy({
        by: ["projectId"],
        where: { ...baseWhere, completedAt: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const totalMap = new Map(totals.map((t) => [t.projectId, t._count._all]));
    const doneMap = new Map(dones.map((t) => [t.projectId, t._count._all]));

    const result = projects.map((p) => {
      const role: ProjectRole =
        p.ownerId === me.id ? "OWNER" : p.members[0]?.role ?? "VIEWER";
      const totalCount = totalMap.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        icon: p.icon,
        isPersonal: p.isPersonal,
        isFavorite: p.isFavorite,
        dueDate: p.dueDate,
        role,
        taskCount: totalCount,
        memberCount: p._count.members,
        doneCount: doneMap.get(p.id) ?? 0,
        totalCount,
        manager: p.owner,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/projects — create a project (with default sections).
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const { name, description, color, icon } = parsed.data;

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        color: color || getRandomColor(),
        icon: icon || "folder",
        ownerId: me.id,
        sections: {
          create: [
            { name: "Todo", position: 0 },
            { name: "In Progress", position: 1 },
            { name: "Done", position: 2 },
          ],
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isPersonal: true,
        isFavorite: true,
        dueDate: true,
        owner: { select: publicUserSelect },
      },
    });

    return NextResponse.json(
      {
        id: project.id,
        name: project.name,
        color: project.color,
        icon: project.icon,
        isPersonal: project.isPersonal,
        isFavorite: project.isFavorite,
        dueDate: project.dueDate,
        role: "OWNER" as ProjectRole,
        taskCount: 0,
        memberCount: 0,
        doneCount: 0,
        totalCount: 0,
        manager: project.owner,
      },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
