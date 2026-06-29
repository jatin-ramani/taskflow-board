import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse } from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";
import { isOnline } from "@/lib/utils";

// GET /api/friends — accepted friends of the current user.
export async function GET() {
  try {
    const me = await requireUser();

    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: me.id }, { addresseeId: me.id }],
      },
      select: {
        id: true,
        createdAt: true,
        respondedAt: true,
        requester: { select: publicUserSelect },
        addressee: { select: publicUserSelect },
        requesterId: true,
      },
      orderBy: { respondedAt: "desc" },
    });

    // We need lastSeenAt for presence; fetch in one batch.
    const otherIds = friendships.map((f) =>
      f.requesterId === me.id ? f.addressee.id : f.requester.id
    );
    const seen = otherIds.length
      ? await prisma.user.findMany({
          where: { id: { in: otherIds } },
          select: { id: true, lastSeenAt: true },
        })
      : [];
    const seenMap = new Map(seen.map((u) => [u.id, u.lastSeenAt]));

    const friends = friendships.map((f) => {
      const user = f.requesterId === me.id ? f.addressee : f.requester;
      const lastSeen = seenMap.get(user.id);
      return {
        friendshipId: f.id,
        user,
        since: f.respondedAt ?? f.createdAt,
        online: lastSeen ? isOnline(lastSeen) : false,
      };
    });

    return NextResponse.json(friends);
  } catch (err) {
    return toErrorResponse(err);
  }
}
