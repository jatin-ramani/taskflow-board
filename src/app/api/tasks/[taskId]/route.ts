import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireTaskRole,
  requireAssignable,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { taskCardSelect, publicUserSelect } from "@/lib/selectors";
import { updateTaskSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";
import { recomputeGoalProgress } from "@/lib/goals";

// GET /api/tasks/[taskId] — full detail (subtasks, comments, activity).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const me = await requireUser();
    const { taskId } = await params;
    await requireTaskRole(me.id, taskId, "VIEWER");

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        ...taskCardSelect,
        description: true,
        startDate: true,
        creatorId: true,
        parentTaskId: true,
        assigneeId: true,
        creator: { select: publicUserSelect },
        section: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, color: true } },
        milestone: { select: { id: true, name: true, color: true } },
        goal: { select: { id: true, title: true, progress: true } },
        subtasks: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
          select: taskCardSelect,
        },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            mentionIds: true,
            createdAt: true,
            author: { select: publicUserSelect },
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            action: true,
            details: true,
            createdAt: true,
            user: { select: publicUserSelect },
          },
        },
      },
    });

    if (!task || (task as { deletedAt?: Date | null }).deletedAt) {
      throw new HttpError(404, "Task not found");
    }

    // Resolve managed tags, followers, and work-log total for the detail view.
    const [resolvedTags, followers, worklog] = await Promise.all([
      task.tagIds.length
        ? prisma.tag.findMany({
            where: { id: { in: task.tagIds } },
            select: { id: true, name: true, color: true },
          })
        : Promise.resolve([]),
      task.followerIds.length
        ? prisma.user.findMany({
            where: { id: { in: task.followerIds } },
            select: publicUserSelect,
          })
        : Promise.resolve([]),
      prisma.timeLog.aggregate({ where: { taskId }, _sum: { durationSeconds: true } }),
    ]);

    return NextResponse.json({
      ...task,
      resolvedTags,
      followers,
      worklogSeconds: worklog._sum.durationSeconds ?? 0,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PATCH /api/tasks/[taskId] — update fields (EDITOR+).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const me = await requireUser();
    const { taskId } = await params;
    const { projectId } = await requireTaskRole(me.id, taskId, "EDITOR");

    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const d = parsed.data;

    const current = await prisma.task.findUnique({
      where: { id: taskId },
      select: { goalId: true, completedAt: true, assigneeId: true },
    });
    if (!current) throw new HttpError(404, "Task not found");

    const data: Record<string, unknown> = {};
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description;
    if (d.priority !== undefined) data.priority = d.priority;
    if (d.position !== undefined) data.position = d.position;
    if (d.tags !== undefined) data.tags = d.tags;
    if (d.isFavorite !== undefined) data.isFavorite = d.isFavorite;
    if (d.dueDate !== undefined) data.dueDate = d.dueDate ? new Date(d.dueDate) : null;
    if (d.startDate !== undefined)
      data.startDate = d.startDate ? new Date(d.startDate) : null;

    // PMS fields
    if (d.taskType !== undefined) data.taskType = d.taskType || null;
    if (d.estimateMinutes !== undefined) data.estimateMinutes = d.estimateMinutes ?? null;
    if (d.billable !== undefined) data.billable = d.billable;
    if (d.milestoneId !== undefined) data.milestoneId = d.milestoneId || null;
    if (d.tagIds !== undefined) data.tagIds = d.tagIds;
    if (d.followerIds !== undefined) data.followerIds = d.followerIds;
    if (d.plannedStart !== undefined)
      data.plannedStart = d.plannedStart ? new Date(d.plannedStart) : null;
    if (d.plannedEnd !== undefined)
      data.plannedEnd = d.plannedEnd ? new Date(d.plannedEnd) : null;

    if (d.sectionId !== undefined) {
      const section = await prisma.section.findFirst({
        where: { id: d.sectionId, projectId },
        select: { id: true },
      });
      if (!section) throw new HttpError(400, "Invalid section for this project");
      data.sectionId = d.sectionId;
    }

    if (d.assigneeId !== undefined) {
      if (d.assigneeId) await requireAssignable(projectId, d.assigneeId);
      data.assigneeId = d.assigneeId || null;
    }

    if (d.goalId !== undefined) {
      if (d.goalId) {
        const goal = await prisma.goal.findUnique({
          where: { id: d.goalId },
          select: { ownerId: true, projectId: true },
        });
        if (!goal || (goal.ownerId !== me.id && goal.projectId !== projectId)) {
          throw new HttpError(400, "Invalid goal");
        }
      }
      data.goalId = d.goalId || null;
    }

    if (d.completed !== undefined) {
      data.completedAt = d.completed ? new Date() : null;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      select: taskCardSelect,
    });

    // Goal progress rollup: recompute any goal that gained/lost this task,
    // or whose completion state changed.
    const goalsToRecompute = new Set<string>();
    if (current.goalId) goalsToRecompute.add(current.goalId);
    if (task.goalId) goalsToRecompute.add(task.goalId);
    for (const g of goalsToRecompute) await recomputeGoalProgress(g);

    // Notify a newly-assigned user.
    if (
      d.assigneeId &&
      d.assigneeId !== me.id &&
      d.assigneeId !== current.assigneeId
    ) {
      await createNotification({
        recipientId: d.assigneeId,
        actorId: me.id,
        type: "TASK_ASSIGNED",
        title: "Task assigned to you",
        body: `${me.name} assigned you “${task.title}”`,
        entityType: "TASK",
        entityId: task.id,
      });
    }

    await logActivity({
      action: d.completed !== undefined ? "COMPLETED" : "UPDATED",
      userId: me.id,
      taskId,
      projectId,
      details: d,
    });

    return NextResponse.json(task);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/tasks/[taskId] — soft delete (EDITOR+).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const me = await requireUser();
    const { taskId } = await params;
    await requireTaskRole(me.id, taskId, "EDITOR");

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
      select: { goalId: true },
    });
    if (task.goalId) await recomputeGoalProgress(task.goalId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
