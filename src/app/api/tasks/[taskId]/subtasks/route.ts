import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/tasks/[taskId]/subtasks
export async function POST(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { taskId } = await params;
    const { title } = await req.json();

    const parentTask = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true, columnId: true } });
    if (!parentTask) return NextResponse.json({ error: "Parent task not found" }, { status: 404 });

    const lastSubtask = await prisma.task.findFirst({ where: { parentTaskId: taskId }, orderBy: { position: "desc" } });

    const subtask = await prisma.task.create({
      data: {
        title, projectId: parentTask.projectId, columnId: parentTask.columnId,
        creatorId: session.user.id, parentTaskId: taskId,
        position: (lastSubtask?.position ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error("POST subtask error:", error);
    return NextResponse.json({ error: "Failed to create subtask" }, { status: 500 });
  }
}
