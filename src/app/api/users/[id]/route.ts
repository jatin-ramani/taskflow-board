import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  areFriends,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";
import { isOnline } from "@/lib/utils";

// GET /api/users/[id] — rich public profile card for the chat profile popup:
// identity + presence + shared projects + mutual friends + friend-since.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { ...publicUserSelect, bio: true, lastSeenAt: true, createdAt: true },
    });
    if (!user) throw new HttpError(404, "User not found");

    const isSelf = id === me.id;

    const [isFriend, sharedProjects, myFriends, theirFriends, friendship] = await Promise.all([
      isSelf ? Promise.resolve(true) : areFriends(me.id, id),
      prisma.project.findMany({
        where: {
          isPersonal: false,
          AND: [
            { OR: [{ ownerId: me.id }, { members: { some: { userId: me.id } } }] },
            { OR: [{ ownerId: id }, { members: { some: { userId: id } } }] },
          ],
        },
        select: { id: true, name: true, color: true },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.friendship.findMany({
        where: { status: "ACCEPTED", OR: [{ requesterId: me.id }, { addresseeId: me.id }] },
        select: { requesterId: true, addresseeId: true },
      }),
      isSelf
        ? Promise.resolve([] as { requesterId: string; addresseeId: string }[])
        : prisma.friendship.findMany({
            where: { status: "ACCEPTED", OR: [{ requesterId: id }, { addresseeId: id }] },
            select: { requesterId: true, addresseeId: true },
          }),
      isSelf
        ? Promise.resolve(null)
        : prisma.friendship.findFirst({
            where: {
              status: "ACCEPTED",
              OR: [
                { requesterId: me.id, addresseeId: id },
                { requesterId: id, addresseeId: me.id },
              ],
            },
            select: { respondedAt: true, createdAt: true },
          }),
    ]);

    const myFriendIds = new Set(
      myFriends.map((f) => (f.requesterId === me.id ? f.addresseeId : f.requesterId))
    );
    const mutualFriends = theirFriends
      .map((f) => (f.requesterId === id ? f.addresseeId : f.requesterId))
      .filter((fid) => fid !== me.id && myFriendIds.has(fid)).length;

    const { lastSeenAt, createdAt, ...rest } = user;
    return NextResponse.json({
      ...rest,
      online: isOnline(lastSeenAt),
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
      createdAt: createdAt.toISOString(),
      isFriend,
      isSelf,
      mutualFriends,
      sharedProjects,
      friendSince:
        friendship?.respondedAt?.toISOString() ?? friendship?.createdAt?.toISOString() ?? null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
