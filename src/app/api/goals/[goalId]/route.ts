import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { taskCardSelect } from "@/lib/selectors";
import { updateGoalSchema } from "@/lib/validations";

async function ownedGoal(goalId: string, userId: string) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { id: true, ownerId: true },
  });
  if (!goal) throw new HttpError(404, "Goal not found");
  if (goal.ownerId !== userId) throw new HttpError(403, "Not your goal");
  return goal;
}

// GET /api/goals/[goalId] — goal detail with its linked tasks.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const me = await requireUser();
    const { goalId } = await params;
    await ownedGoal(goalId, me.id);

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        targetDate: true,
        progress: true,
        projectId: true,
        project: { select: { id: true, name: true, color: true } },
        tasks: {
          where: { deletedAt: null },
          orderBy: [{ completedAt: "asc" }, { createdAt: "desc" }],
          select: {
            ...taskCardSelect,
            section: { select: { id: true, name: true } },
            project: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    if (!goal) throw new HttpError(404, "Goal not found");

    const completedCount = goal.tasks.filter((t) => t.completedAt).length;
    return NextResponse.json({
      ...goal,
      taskCount: goal.tasks.length,
      completedCount,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PATCH /api/goals/[goalId] — update goal fields.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const me = await requireUser();
    const { goalId } = await params;
    await ownedGoal(goalId, me.id);

    const body = await req.json();
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const d = parsed.data;

    if (d.projectId) await requireProjectRole(me.id, d.projectId, "VIEWER");

    const data: Record<string, unknown> = {};
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description;
    if (d.status !== undefined) data.status = d.status;
    if (d.projectId !== undefined) data.projectId = d.projectId || null;
    if (d.targetDate !== undefined)
      data.targetDate = d.targetDate ? new Date(d.targetDate) : null;

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        targetDate: true,
        progress: true,
        projectId: true,
      },
    });
    return NextResponse.json(goal);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/goals/[goalId] — delete (linked tasks keep, goalId nulled by schema).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const me = await requireUser();
    const { goalId } = await params;
    await ownedGoal(goalId, me.id);
    await prisma.goal.delete({ where: { id: goalId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
