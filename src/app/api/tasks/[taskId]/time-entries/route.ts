import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/tasks/[taskId]/time-entries — start timer or add manual entry
export async function POST(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { taskId } = await params;
    const body = await req.json();

    // Stop any running timer for this user
    if (body.isRunning) {
      await prisma.timeEntry.updateMany({
        where: { userId: session.user.id, isRunning: true },
        data: { isRunning: false, endTime: new Date() },
      });
    }

    const entry = await prisma.timeEntry.create({
      data: {
        taskId, userId: session.user.id,
        startTime: new Date(body.startTime || new Date()),
        endTime: body.endTime ? new Date(body.endTime) : null,
        duration: body.duration || null,
        description: body.description || null,
        isRunning: body.isRunning ?? false,
      },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    if (!body.isRunning && body.duration) {
      await prisma.task.update({ where: { id: taskId }, data: { totalTimeLogged: { increment: body.duration } } });
    }

    await prisma.activity.create({ data: { action: "TIME_LOGGED", taskId, userId: session.user.id } });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST time entry error:", error);
    return NextResponse.json({ error: "Failed to create time entry" }, { status: 500 });
  }
}

// GET /api/tasks/[taskId]/time-entries
export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { taskId } = await params;

    const entries = await prisma.timeEntry.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("GET time entries error:", error);
    return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 });
  }
}

// PUT /api/tasks/[taskId]/time-entries — stop a running timer
export async function PUT(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { taskId } = await params;
    const body = await req.json();

    const entry = await prisma.timeEntry.findFirst({ where: { taskId, userId: session.user.id, isRunning: true } });
    if (!entry) return NextResponse.json({ error: "No running timer" }, { status: 404 });

    const endTime = new Date(body.endTime || new Date());
    const duration = Math.floor((endTime.getTime() - entry.startTime.getTime()) / 1000);

    const updated = await prisma.timeEntry.update({
      where: { id: entry.id },
      data: { isRunning: false, endTime, duration },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    await prisma.task.update({ where: { id: taskId }, data: { totalTimeLogged: { increment: duration } } });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT time entry error:", error);
    return NextResponse.json({ error: "Failed to stop timer" }, { status: 500 });
  }
}
