import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { createMilestoneSchema } from "@/lib/validations";

// GET /api/projects/[projectId]/milestones — with task counts.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;
    await requireProjectRole(me.id, projectId, "VIEWER");

    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        color: true,
        dueDate: true,
        completed: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      milestones.map(({ _count, ...m }) => ({ ...m, taskCount: _count.tasks }))
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/projects/[projectId]/milestones
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;
    await requireProjectRole(me.id, projectId, "EDITOR");

    const body = await req.json();
    const parsed = createMilestoneSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const m = await prisma.milestone.create({
      data: {
        name: parsed.data.name,
        color: parsed.data.color || "#5b5fc7",
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        projectId,
      },
      select: { id: true, name: true, color: true, dueDate: true, completed: true },
    });
    return NextResponse.json({ ...m, taskCount: 0 }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
