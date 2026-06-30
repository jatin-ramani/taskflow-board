import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireConversationParticipant,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";

// POST /api/conversations/[id]/leave — leave a group conversation.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    await requireConversationParticipant(me.id, id);

    const convo = await prisma.conversation.findUnique({
      where: { id },
      select: { isGroup: true, _count: { select: { participants: true } } },
    });
    if (!convo) throw new HttpError(404, "Conversation not found");
    if (!convo.isGroup) throw new HttpError(400, "You can't leave a DM");

    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: id, userId: me.id },
    });

    // If the group is now empty, remove it entirely.
    if (convo._count.participants <= 1) {
      await prisma.conversation.delete({ where: { id } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
