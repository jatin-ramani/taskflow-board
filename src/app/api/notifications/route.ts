import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse } from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";

// GET /api/notifications — recent notifications + unread count.
export async function GET() {
  try {
    const me = await requireUser();

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: me.id },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          entityType: true,
          entityId: true,
          isRead: true,
          createdAt: true,
          actor: { select: publicUserSelect },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: { recipientId: me.id, isRead: false },
      }),
    ]);

    return NextResponse.json({ items, unreadCount });
  } catch (err) {
    return toErrorResponse(err);
  }
}
