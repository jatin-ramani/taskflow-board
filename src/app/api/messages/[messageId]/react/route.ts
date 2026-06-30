import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireConversationParticipant,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { reactSchema } from "@/lib/validations";
import { publishToUser } from "@/lib/realtime";

// POST /api/messages/[messageId]/react — toggle a reaction (one per user, Teams-style).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const me = await requireUser();
    const { messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true, reactions: true, deletedAt: true },
    });
    if (!message || message.deletedAt) throw new HttpError(404, "Message not found");
    await requireConversationParticipant(me.id, message.conversationId);

    const body = await req.json();
    const parsed = reactSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const emoji = parsed.data.emoji;

    const reactions: Record<string, string[]> = {
      ...((message.reactions as Record<string, string[]>) ?? {}),
    };
    const alreadyOnEmoji = (reactions[emoji] ?? []).includes(me.id);

    // One reaction per user: clear me from every emoji first.
    for (const key of Object.keys(reactions)) {
      reactions[key] = reactions[key].filter((id) => id !== me.id);
      if (reactions[key].length === 0) delete reactions[key];
    }
    // Toggle: if I wasn't already on this emoji, add me.
    if (!alreadyOnEmoji) {
      reactions[emoji] = [...(reactions[emoji] ?? []), me.id];
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { reactions },
    });

    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId: message.conversationId, userId: { not: me.id } },
      select: { userId: true },
    });
    for (const o of others) {
      publishToUser(o.userId, { type: "message", conversationId: message.conversationId });
    }

    return NextResponse.json({ reactions });
  } catch (err) {
    return toErrorResponse(err);
  }
}
