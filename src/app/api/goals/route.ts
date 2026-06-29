import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { createGoalSchema } from "@/lib/validations";

// GET /api/goals — the current user's goals with rolled-up task counts.
export async function GET() {
  try {
    const me = await requireUser();

    const goals = await prisma.goal.findMany({
      where: { ownerId: me.id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        targetDate: true,
        progress: true,
        projectId: true,
        project: { select: { id: true, name: true, color: true } },
        tasks: { where: { deletedAt: null }, select: { completedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = goals.map(({ tasks, ...g }) => ({
      ...g,
      taskCount: tasks.length,
      completedCount: tasks.filter((t) => t.completedAt).length,
    }));

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/goals — create a goal.
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json();
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const { title, description, targetDate, projectId } = parsed.data;
    if (projectId) await requireProjectRole(me.id, projectId, "VIEWER");

    const goal = await prisma.goal.create({
      data: {
        title,
        description: description || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        projectId: projectId || null,
        ownerId: me.id,
        progress: 0,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        targetDate: true,
        progress: true,
        projectId: true,
        project: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json(
      { ...goal, taskCount: 0, completedCount: 0 },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
