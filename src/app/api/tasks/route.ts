import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  requireAssignable,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { taskCardSelect } from "@/lib/selectors";
import { createTaskSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";
import { recomputeGoalProgress } from "@/lib/goals";

// GET /api/tasks?scope=mine&completed=false — current user's tasks across projects.
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") ?? "mine";
    const completed = searchParams.get("completed");

    const where: Record<string, unknown> = {
      parentTaskId: null,
      deletedAt: null,
    };
    if (scope === "created") where.creatorId = me.id;
    else where.assigneeId = me.id;
    if (completed === "true") where.completedAt = { not: null };
    if (completed === "false") where.completedAt = null;

    const tasks = await prisma.task.findMany({
      where,
      select: {
        ...taskCardSelect,
        section: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ completedAt: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      take: 200,
    });

    return NextResponse.json(tasks);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/tasks — create a task.
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const d = parsed.data;
    await requireProjectRole(me.id, d.projectId, "EDITOR");

    // Section must belong to the project.
    const section = await prisma.section.findFirst({
      where: { id: d.sectionId, projectId: d.projectId },
      select: { id: true },
    });
    if (!section) throw new HttpError(400, "Invalid section for this project");

    if (d.assigneeId) await requireAssignable(d.projectId, d.assigneeId);

    if (d.goalId) {
      const goal = await prisma.goal.findUnique({
        where: { id: d.goalId },
        select: { ownerId: true, projectId: true },
      });
      if (!goal || (goal.ownerId !== me.id && goal.projectId !== d.projectId)) {
        throw new HttpError(400, "Invalid goal");
      }
    }

    const last = await prisma.task.findFirst({
      where: { sectionId: d.sectionId, parentTaskId: d.parentTaskId ?? null },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title: d.title,
        description: d.description || null,
        priority: d.priority ?? "NONE",
        projectId: d.projectId,
        sectionId: d.sectionId,
        creatorId: me.id,
        assigneeId: d.assigneeId || null,
        parentTaskId: d.parentTaskId || null,
        goalId: d.goalId || null,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        startDate: d.startDate ? new Date(d.startDate) : null,
        tags: d.tags ?? [],
        position: (last?.position ?? -1) + 1,
        taskType: d.taskType || null,
        estimateMinutes: d.estimateMinutes ?? null,
        billable: d.billable ?? false,
        milestoneId: d.milestoneId || null,
        tagIds: d.tagIds ?? [],
        followerIds: d.followerIds ?? [],
        plannedStart: d.plannedStart ? new Date(d.plannedStart) : null,
        plannedEnd: d.plannedEnd ? new Date(d.plannedEnd) : null,
        // Write nullable filter-fields explicitly: MongoDB distinguishes a JSON
        // `null` from an absent field, and our `{ field: null }` filters only
        // match explicit null. Keeping documents uniform keeps those filters correct.
        completedAt: null,
        deletedAt: null,
      },
      select: taskCardSelect,
    });

    await logActivity({
      action: "CREATED",
      userId: me.id,
      taskId: task.id,
      projectId: d.projectId,
      details: { title: d.title },
    });

    if (d.assigneeId && d.assigneeId !== me.id) {
      await createNotification({
        recipientId: d.assigneeId,
        actorId: me.id,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        body: `${me.name} assigned you “${d.title}”`,
        entityType: "TASK",
        entityId: task.id,
      });
    }

    if (d.goalId) await recomputeGoalProgress(d.goalId);

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
