import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validations";

// GET /api/tasks — list tasks (filterable by projectId, assigneeId, status)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const assigneeId = searchParams.get("assigneeId");
    const status = searchParams.get("status");
    const myTasks = searchParams.get("myTasks");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;
    if (myTasks === "true") where.assigneeId = session.user.id;
    where.parentTaskId = null; // Only top-level tasks

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        column: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// POST /api/tasks — create task
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { title, description, priority, projectId, columnId, assigneeId, dueDate, startDate, parentTaskId, tags } = parsed.data;

    // Get position (add at end of column)
    const lastTask = await prisma.task.findFirst({ where: { columnId, parentTaskId: parentTaskId || null }, orderBy: { position: "desc" } });
    const position = (lastTask?.position ?? -1) + 1;

    const task = await prisma.task.create({
      data: {
        title, description, priority: priority || "NONE",
        projectId, columnId, creatorId: session.user.id,
        assigneeId: assigneeId || null, position,
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        parentTaskId: parentTaskId || null,
        tags: tags || [],
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    });

    // Log activity
    await prisma.activity.create({ data: { action: "CREATED", taskId: task.id, projectId, userId: session.user.id, details: JSON.stringify({ title }) } });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
