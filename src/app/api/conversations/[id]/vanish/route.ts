import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireConversationParticipant,
  toErrorResponse,
} from "@/lib/authz";
import { publishToUser } from "@/lib/realtime";

// DELETE /api/conversations/[id]/vanish — purge vanish messages on chat close.
// Vanish mode itself stays ON; only the ephemeral messages are removed.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    await requireConversationParticipant(me.id, id);

    const res = await prisma.message.updateMany({
      where: { conversationId: id, vanish: true, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (res.count > 0) {
      const parts = await prisma.conversationParticipant.findMany({
        where: { conversationId: id, userId: { not: me.id } },
        select: { userId: true },
      });
      for (const p of parts)
        publishToUser(p.userId, { type: "message", conversationId: id });
    }

    return NextResponse.json({ ok: true, purged: res.count });
  } catch (err) {
    return toErrorResponse(err);
  }
}
