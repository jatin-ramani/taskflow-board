import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireConversationParticipant,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { updateConversationSchema } from "@/lib/validations";
import { publishToUser } from "@/lib/realtime";

// PATCH /api/conversations/[id] — rename / set icon (groups only).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    await requireConversationParticipant(me.id, id);

    const convo = await prisma.conversation.findUnique({
      where: { id },
      select: { isGroup: true },
    });
    if (!convo) throw new HttpError(404, "Conversation not found");

    const body = await req.json();
    const parsed = updateConversationSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const data: Record<string, unknown> = {};
    // name/avatar are group-only; disappearing applies to any conversation.
    if (parsed.data.name !== undefined || parsed.data.avatar !== undefined) {
      if (!convo.isGroup) throw new HttpError(400, "Only groups can be renamed");
      if (parsed.data.name !== undefined) data.name = parsed.data.name;
      if (parsed.data.avatar !== undefined) data.avatar = parsed.data.avatar || null;
    }
    if (parsed.data.disappearSeconds !== undefined) {
      data.disappearSeconds = parsed.data.disappearSeconds || null;
    }

    await prisma.conversation.update({ where: { id }, data });

    const parts = await prisma.conversationParticipant.findMany({
      where: { conversationId: id, userId: { not: me.id } },
      select: { userId: true },
    });
    for (const p of parts) publishToUser(p.userId, { type: "message", conversationId: id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
