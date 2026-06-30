import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";
import { editMessageSchema } from "@/lib/validations";
import { publishToUser } from "@/lib/realtime";

async function notifyConversation(conversationId: string, exceptUserId: string) {
  const parts = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: exceptUserId } },
    select: { userId: true },
  });
  for (const p of parts) {
    publishToUser(p.userId, { type: "message", conversationId });
  }
}

// PATCH /api/messages/[messageId] — edit your own message.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const me = await requireUser();
    const { messageId } = await params;

    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) throw new HttpError(404, "Message not found");
    if (existing.senderId !== me.id) throw new HttpError(403, "Not your message");

    const body = await req.json();
    const parsed = editMessageSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { content: parsed.data.content, editedAt: new Date() },
      select: {
        id: true,
        content: true,
        senderId: true,
        attachments: true,
        reactions: true,
        createdAt: true,
        editedAt: true,
        sender: { select: publicUserSelect },
        replyTo: {
          select: {
            id: true,
            content: true,
            deletedAt: true,
            sender: { select: { name: true } },
          },
        },
      },
    });

    await notifyConversation(existing.conversationId, me.id);
    return NextResponse.json({
      ...message,
      reactions: message.reactions ?? {},
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            content: message.replyTo.deletedAt ? "Deleted message" : message.replyTo.content,
            senderName: message.replyTo.sender.name,
          }
        : null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/messages/[messageId] — soft-delete your own message.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const me = await requireUser();
    const { messageId } = await params;

    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true },
    });
    if (!existing) throw new HttpError(404, "Message not found");
    if (existing.senderId !== me.id) throw new HttpError(403, "Not your message");

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    await notifyConversation(existing.conversationId, me.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
