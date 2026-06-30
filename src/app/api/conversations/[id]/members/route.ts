import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireConversationParticipant,
  requireFriendship,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { addMembersSchema } from "@/lib/validations";

// POST /api/conversations/[id]/members — add friends to a group.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    await requireConversationParticipant(me.id, id);

    const convo = await prisma.conversation.findUnique({
      where: { id },
      select: { isGroup: true, participants: { select: { userId: true } } },
    });
    if (!convo) throw new HttpError(404, "Conversation not found");
    if (!convo.isGroup) throw new HttpError(400, "Can't add people to a DM");

    const body = await req.json();
    const parsed = addMembersSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const existing = new Set(convo.participants.map((p) => p.userId));
    const toAdd = [...new Set(parsed.data.userIds)].filter(
      (uid) => uid !== me.id && !existing.has(uid)
    );
    for (const uid of toAdd) await requireFriendship(me.id, uid);

    if (toAdd.length > 0) {
      await prisma.conversationParticipant.createMany({
        data: toAdd.map((userId) => ({ conversationId: id, userId })),
      });
    }

    return NextResponse.json({ ok: true, added: toAdd.length });
  } catch (err) {
    return toErrorResponse(err);
  }
}
