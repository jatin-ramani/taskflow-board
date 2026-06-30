import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireConversationParticipant,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { conversationSettingsSchema } from "@/lib/validations";

// PATCH /api/conversations/[id]/settings — per-user mute / favorite / clear-history.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    await requireConversationParticipant(me.id, id);

    const body = await req.json();
    const parsed = conversationSettingsSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const data: Record<string, unknown> = {};
    if (parsed.data.muted !== undefined) data.muted = parsed.data.muted;
    if (parsed.data.favorite !== undefined) data.favorite = parsed.data.favorite;
    if (parsed.data.clear) data.clearedAt = new Date();

    await prisma.conversationParticipant.updateMany({
      where: { conversationId: id, userId: me.id },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
