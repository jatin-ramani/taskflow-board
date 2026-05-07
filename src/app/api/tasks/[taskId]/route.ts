import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/tasks/[taskId] — full task with subtasks, comments, time entries, activity
export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
        column: { select: { id: true, name: true, color: true } },
        subtasks: {
          orderBy: { position: "asc" },
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            _count: { select: { subtasks: true, comments: true } },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        timeEntries: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        _count: { select: { subtasks: true, comments: true } },
      },
    });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    console.error("GET task error:", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

// PUT /api/tasks/[taskId] — update task
export async function PUT(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { taskId } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.columnId !== undefined) updateData.columnId = body.columnId;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId || null;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.tags !== undefined) updateData.tags = body.tags;

    // If marking as done
    if (body.status === "DONE") updateData.completedAt = new Date();
    if (body.status && body.status !== "DONE") updateData.completedAt = null;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    });

    // Log activity
    const action = body.columnId ? "MOVED" : body.status === "DONE" ? "COMPLETED" : "UPDATED";
    await prisma.activity.create({ data: { action, taskId, projectId: task.projectId, userId: session.user.id, details: JSON.stringify(body) } });

    return NextResponse.json(task);
  } catch (error) {
    console.error("PUT task error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

// DELETE /api/tasks/[taskId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { taskId } = await params;

    await prisma.task.delete({ where: { id: taskId } });
    return NextResponse.json({ message: "Task deleted" });
  } catch (error) {
    console.error("DELETE task error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
