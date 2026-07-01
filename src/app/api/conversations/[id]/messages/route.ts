import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireConversationParticipant,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";
import { sendMessageSchema } from "@/lib/validations";
import { publishToUser } from "@/lib/realtime";
import { isOnline } from "@/lib/utils";
import type { MessageStatus } from "@/types";

const messageSelect = {
  id: true,
  content: true,
  senderId: true,
  attachments: true,
  reactions: true,
  system: true,
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
} as const;

type RawMessage = {
  reactions: unknown;
  replyTo: { id: string; content: string; deletedAt: Date | null; sender: { name: string } } | null;
  [k: string]: unknown;
};

export function shapeMessage(m: RawMessage) {
  const { replyTo, ...rest } = m;
  return {
    ...rest,
    reactions: m.reactions ?? {},
    replyTo: replyTo
      ? {
          id: replyTo.id,
          content: replyTo.deletedAt ? "Deleted message" : replyTo.content,
          senderName: replyTo.sender.name,
        }
      : null,
  };
}

// GET /api/conversations/[id]/messages — history + conversation meta.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const part = await requireConversationParticipant(me.id, id);
    const afterCleared = part.clearedAt ? { createdAt: { gt: part.clearedAt } } : {};

    const [messages, convo] = await Promise.all([
      prisma.message.findMany({
        where: {
          conversationId: id,
          deletedAt: null,
          ...afterCleared,
        },
        orderBy: { createdAt: "asc" },
        take: 300,
        select: messageSelect,
      }),
      prisma.conversation.findUnique({
        where: { id },
        select: {
          id: true,
          isGroup: true,
          name: true,
          avatar: true,
          pinnedMessageId: true,
          vanishMode: true,
          participants: {
            select: {
              userId: true,
              lastReadAt: true,
              lastDeliveredAt: true,
              user: { select: { ...publicUserSelect, lastSeenAt: true } },
            },
          },
        },
      }),
    ]);

    // WhatsApp-style receipts for the current user's own messages: sent → the
    // others haven't synced; delivered → all others synced after it; seen → all
    // others read past it. (For groups this means "everyone".)
    const otherParts = (convo?.participants ?? []).filter((p) => p.userId !== me.id);
    function statusFor(m: { senderId: string; createdAt: Date }): MessageStatus | null {
      if (m.senderId !== me.id) return null;
      if (otherParts.length === 0) return "sent";
      if (otherParts.every((p) => p.lastReadAt && p.lastReadAt >= m.createdAt)) return "seen";
      if (otherParts.every((p) => p.lastDeliveredAt && p.lastDeliveredAt >= m.createdAt))
        return "delivered";
      return "sent";
    }

    let pinned = null;
    if (convo?.pinnedMessageId) {
      const pm = await prisma.message.findFirst({
        where: { id: convo.pinnedMessageId, conversationId: id, deletedAt: null },
        select: { id: true, content: true, sender: { select: { name: true } } },
      });
      if (pm) pinned = { id: pm.id, content: pm.content, senderName: pm.sender.name };
    }

    const others =
      convo?.participants.filter((p) => p.user.id !== me.id) ?? [];
    const members = (convo?.participants ?? []).map(({ user }) => {
      const { lastSeenAt, ...u } = user;
      return { ...u, online: isOnline(lastSeenAt) };
    });

    const meta = convo
      ? {
          id: convo.id,
          isGroup: convo.isGroup,
          title: convo.isGroup ? convo.name ?? "Group" : others[0]?.user.name ?? "Unknown",
          image: convo.isGroup ? convo.avatar : null,
          members,
          online: convo.isGroup
            ? false
            : others[0]?.user.lastSeenAt
              ? isOnline(others[0].user.lastSeenAt)
              : false,
          pinned,
          vanishMode: convo.vanishMode,
        }
      : null;

    return NextResponse.json({
      messages: messages.map((m) => ({ ...shapeMessage(m), status: statusFor(m) })),
      meta,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/conversations/[id]/messages — send a message (content and/or attachments).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    await requireConversationParticipant(me.id, id);

    const body = await req.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const content = parsed.data.content?.trim() ?? "";
    const attachments = parsed.data.attachments ?? [];
    if (!content && attachments.length === 0) {
      throw new HttpError(400, "Message cannot be empty");
    }

    // Validate reply target belongs to this conversation.
    let replyToId: string | null = null;
    if (parsed.data.replyToId) {
      const target = await prisma.message.findFirst({
        where: { id: parsed.data.replyToId, conversationId: id, deletedAt: null },
        select: { id: true },
      });
      replyToId = target?.id ?? null;
    }

    // Vanish mode: mark messages sent during a vanish session as ephemeral.
    const settings = await prisma.conversation.findUnique({
      where: { id },
      select: { vanishMode: true },
    });
    const vanish = settings?.vanishMode ?? false;

    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: id,
          senderId: me.id,
          content,
          attachments,
          replyToId,
          vanish,
          deletedAt: null,
        },
        select: messageSelect,
      }),
      prisma.conversation.update({ where: { id }, data: { lastMessageAt: now } }),
      prisma.conversationParticipant.updateMany({
        where: { conversationId: id, userId: me.id },
        data: { lastReadAt: now },
      }),
    ]);

    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId: id, userId: { not: me.id } },
      select: { userId: true },
    });
    for (const o of others) {
      publishToUser(o.userId, { type: "message", conversationId: id });
    }

    return NextResponse.json({ ...shapeMessage(message), status: "sent" as const }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
