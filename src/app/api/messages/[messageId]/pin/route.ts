import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireConversationParticipant,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { publishToUser } from "@/lib/realtime";

// POST /api/messages/[messageId]/pin — toggle the conversation's pinned message.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const me = await requireUser();
    const { messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true, deletedAt: true },
    });
    if (!message || message.deletedAt) throw new HttpError(404, "Message not found");
    await requireConversationParticipant(me.id, message.conversationId);

    const convo = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      select: { pinnedMessageId: true },
    });
    const alreadyPinned = convo?.pinnedMessageId === messageId;

    await prisma.conversation.update({
      where: { id: message.conversationId },
      data: { pinnedMessageId: alreadyPinned ? null : messageId },
    });

    const parts = await prisma.conversationParticipant.findMany({
      where: { conversationId: message.conversationId, userId: { not: me.id } },
      select: { userId: true },
    });
    for (const p of parts) {
      publishToUser(p.userId, { type: "message", conversationId: message.conversationId });
    }

    return NextResponse.json({ pinned: !alreadyPinned });
  } catch (err) {
    return toErrorResponse(err);
  }
}
