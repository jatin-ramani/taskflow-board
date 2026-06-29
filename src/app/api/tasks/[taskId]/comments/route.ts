import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireTaskRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";
import { createCommentSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";

// POST /api/tasks/[taskId]/comments — add a comment (with optional @mentions).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const me = await requireUser();
    const { taskId } = await params;
    const { projectId } = await requireTaskRole(me.id, taskId, "VIEWER");

    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true, creatorId: true, assigneeId: true },
    });
    if (!task) throw new HttpError(404, "Task not found");

    const comment = await prisma.comment.create({
      data: {
        content: parsed.data.content,
        mentionIds: parsed.data.mentionIds ?? [],
        taskId,
        authorId: me.id,
      },
      select: {
        id: true,
        content: true,
        mentionIds: true,
        createdAt: true,
        author: { select: publicUserSelect },
      },
    });

    await logActivity({
      action: "COMMENTED",
      userId: me.id,
      taskId,
      projectId,
    });

    // Notify mentioned users + task stakeholders (deduped, excluding self).
    const mentions = new Set(parsed.data.mentionIds ?? []);
    const stakeholders = new Set(
      [task.creatorId, task.assigneeId].filter(
        (id): id is string => !!id && id !== me.id && !mentions.has(id)
      )
    );

    await Promise.all([
      ...[...mentions]
        .filter((id) => id !== me.id)
        .map((id) =>
          createNotification({
            recipientId: id,
            actorId: me.id,
            type: "TASK_MENTION",
            title: "You were mentioned",
            body: `${me.name} mentioned you on “${task.title}”`,
            entityType: "TASK",
            entityId: taskId,
          })
        ),
      ...[...stakeholders].map((id) =>
        createNotification({
          recipientId: id,
          actorId: me.id,
          type: "TASK_COMMENT",
          title: "New comment",
          body: `${me.name} commented on “${task.title}”`,
          entityType: "TASK",
          entityId: taskId,
        })
      ),
    ]);

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
