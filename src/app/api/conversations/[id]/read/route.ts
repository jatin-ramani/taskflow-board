import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireConversationParticipant,
  toErrorResponse,
} from "@/lib/authz";

// POST /api/conversations/[id]/read — mark the thread read up to now.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    await requireConversationParticipant(me.id, id);

    await prisma.conversationParticipant.updateMany({
      where: { conversationId: id, userId: me.id },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
