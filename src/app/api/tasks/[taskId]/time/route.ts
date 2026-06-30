import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireTaskRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";
import { addWorklogSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";

// GET /api/tasks/[taskId]/time — work logs for a task.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const me = await requireUser();
    const { taskId } = await params;
    await requireTaskRole(me.id, taskId, "VIEWER");

    const logs = await prisma.timeLog.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        durationSeconds: true,
        note: true,
        startedAt: true,
        createdAt: true,
        user: { select: publicUserSelect },
      },
    });

    const totalSeconds = logs.reduce((n, l) => n + l.durationSeconds, 0);
    return NextResponse.json({ logs, totalSeconds });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/tasks/[taskId]/time — log work on a task.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const me = await requireUser();
    const { taskId } = await params;
    const { projectId } = await requireTaskRole(me.id, taskId, "EDITOR");

    const body = await req.json();
    const parsed = addWorklogSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const now = new Date();
    const log = await prisma.timeLog.create({
      data: {
        taskId,
        userId: me.id,
        startedAt: new Date(now.getTime() - parsed.data.durationSeconds * 1000),
        endedAt: now,
        durationSeconds: parsed.data.durationSeconds,
        note: parsed.data.note || null,
      },
      select: { id: true, durationSeconds: true },
    });

    await logActivity({
      action: "TIME_LOGGED",
      userId: me.id,
      taskId,
      projectId,
      details: { seconds: parsed.data.durationSeconds },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
