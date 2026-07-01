import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireFriendship,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";
import { startConversationSchema, createGroupSchema } from "@/lib/validations";
import { pairKey, isOnline } from "@/lib/utils";

// GET /api/conversations — DMs + groups with last message, unread, presence.
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();

    // Only the active messages view passes ?deliver=1, so the recipient's
    // "delivered" (✓✓) receipts are recorded there — background/sidebar polls of
    // this endpoint stay read-only and don't cause write churn/contention.
    if (req.nextUrl.searchParams.get("deliver") === "1") {
      await prisma.conversationParticipant.updateMany({
        where: { userId: me.id },
        data: { lastDeliveredAt: new Date() },
      });
    }

    const convos = await prisma.conversation.findMany({
      where: { participants: { some: { userId: me.id } } },
      select: {
        id: true,
        isGroup: true,
        name: true,
        avatar: true,
        lastMessageAt: true,
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            muted: true,
            favorite: true,
            clearedAt: true,
            user: { select: { ...publicUserSelect, lastSeenAt: true } },
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    const result = await Promise.all(
      convos.map(async (c) => {
        const mine = c.participants.find((p) => p.userId === me.id);
        const others = c.participants.filter((p) => p.userId !== me.id);
        if (others.length === 0 && !c.isGroup) return null;

        const cleared = mine?.clearedAt ?? null;
        const afterCleared = cleared ? { createdAt: { gt: cleared } } : {};

        const last = await prisma.message.findFirst({
          where: { conversationId: c.id, deletedAt: null, ...afterCleared },
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            attachments: true,
            createdAt: true,
            senderId: true,
            sender: { select: { name: true } },
          },
        });

        // "Deleted/cleared" conversations stay hidden until a new message.
        if (cleared && !last) return null;

        const unreadAfter =
          mine?.lastReadAt && cleared
            ? mine.lastReadAt > cleared
              ? mine.lastReadAt
              : cleared
            : mine?.lastReadAt ?? cleared;

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: c.id,
            deletedAt: null,
            senderId: { not: me.id },
            ...(unreadAfter ? { createdAt: { gt: unreadAfter } } : {}),
          },
        });

        const avatarUsers = others.map(({ user }) => {
          const { lastSeenAt: _drop, ...u } = user;
          void _drop;
          return u;
        });

        const lastMessage = last
          ? {
              content:
                last.content || (last.attachments.length ? "📷 Photo" : ""),
              createdAt: last.createdAt,
              isMine: last.senderId === me.id,
              senderName: c.isGroup
                ? last.senderId === me.id
                  ? "You"
                  : last.sender.name
                : null,
            }
          : null;

        const otherSeen = others[0]?.user.lastSeenAt;

        return {
          id: c.id,
          isGroup: c.isGroup,
          title: c.isGroup ? c.name ?? "Group" : others[0]?.user.name ?? "Unknown",
          image: c.isGroup ? c.avatar : null,
          avatarUsers,
          memberCount: c.participants.length,
          lastMessage,
          lastMessageAt: c.lastMessageAt,
          unreadCount: mine?.muted ? 0 : unreadCount,
          online: c.isGroup ? false : otherSeen ? isOnline(otherSeen) : false,
          muted: !!mine?.muted,
          favorite: !!mine?.favorite,
        };
      })
    );

    return NextResponse.json(result.filter(Boolean));
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/conversations — DM ({ userId }) or group ({ name, userIds }).
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json();

    // --- Group ---
    if (Array.isArray(body?.userIds)) {
      const parsed = createGroupSchema.safeParse(body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
      const ids = [...new Set(parsed.data.userIds)].filter((id) => id !== me.id);
      if (ids.length === 0) throw new HttpError(400, "Add at least one friend");
      for (const id of ids) await requireFriendship(me.id, id);

      const convo = await prisma.conversation.create({
        data: {
          isGroup: true,
          name: parsed.data.name,
          pairKey: `g_${randomBytes(12).toString("hex")}`,
          participants: { create: [me.id, ...ids].map((userId) => ({ userId })) },
        },
        select: { id: true },
      });
      return NextResponse.json({ id: convo.id }, { status: 201 });
    }

    // --- DM (find or create) ---
    const parsed = startConversationSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const { userId } = parsed.data;
    if (userId === me.id) throw new HttpError(400, "You can't message yourself");
    await requireFriendship(me.id, userId);

    const key = pairKey(me.id, userId);
    const existing = await prisma.conversation.findFirst({
      where: { pairKey: key },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ id: existing.id });

    const convo = await prisma.conversation.create({
      data: {
        isGroup: false,
        pairKey: key,
        participants: { create: [{ userId: me.id }, { userId }] },
      },
      select: { id: true },
    });
    return NextResponse.json({ id: convo.id }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
