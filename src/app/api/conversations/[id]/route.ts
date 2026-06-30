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
      select: { isGroup: true, vanishMode: true },
    });
    if (!convo) throw new HttpError(404, "Conversation not found");

    const body = await req.json();
    const parsed = updateConversationSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const data: Record<string, unknown> = {};
    // name/avatar are group-only; vanish mode applies to any conversation.
    if (parsed.data.name !== undefined || parsed.data.avatar !== undefined) {
      if (!convo.isGroup) throw new HttpError(400, "Only groups can be renamed");
      if (parsed.data.name !== undefined) data.name = parsed.data.name;
      if (parsed.data.avatar !== undefined) data.avatar = parsed.data.avatar || null;
    }
    let vanishChanged: boolean | null = null;
    if (
      parsed.data.vanishMode !== undefined &&
      parsed.data.vanishMode !== convo.vanishMode
    ) {
      data.vanishMode = parsed.data.vanishMode;
      vanishChanged = parsed.data.vanishMode;
      // Turning vanish mode OFF restores the old chat: purge messages that were
      // sent during the vanish session, keep everything from before.
      if (parsed.data.vanishMode === false) {
        await prisma.message.updateMany({
          where: { conversationId: id, vanish: true, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }
    }

    await prisma.conversation.update({ where: { id }, data });

    // Leave a persistent system note: the "on" note doubles as the start
    // separator; the on/off pair is the history once vanish content is purged.
    if (vanishChanged !== null) {
      await prisma.message.create({
        data: {
          conversationId: id,
          senderId: me.id,
          content: vanishChanged ? "turned on vanish mode" : "turned off vanish mode",
          system: true,
          vanish: false,
          deletedAt: null,
        },
      });
      await prisma.conversation.update({
        where: { id },
        data: { lastMessageAt: new Date() },
      });
    }

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
