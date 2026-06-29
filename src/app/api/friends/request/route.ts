import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse, HttpError } from "@/lib/authz";
import { friendRequestSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";
import { pairKey } from "@/lib/utils";

// POST /api/friends/request — send (or auto-accept) a friend request.
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json();
    const parsed = friendRequestSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const { publicId, username, userId } = parsed.data;

    // Resolve the target user.
    const target = await prisma.user.findFirst({
      where: userId
        ? { id: userId }
        : publicId
          ? { publicId: publicId.trim().toUpperCase() }
          : username
            ? { username: username.trim().replace(/^@/, "").toLowerCase() }
            : { id: "__none__" },
      select: { id: true, name: true },
    });

    if (!target) throw new HttpError(404, "User not found");
    if (target.id === me.id) throw new HttpError(400, "You can't add yourself");

    const key = pairKey(me.id, target.id);
    const existing = await prisma.friendship.findUnique({ where: { pairKey: key } });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        throw new HttpError(400, "You're already friends");
      }
      if (existing.status === "BLOCKED") {
        throw new HttpError(403, "Unable to send request");
      }
      if (existing.status === "PENDING") {
        if (existing.requesterId === me.id) {
          throw new HttpError(400, "Request already sent");
        }
        // They already requested me → mutual intent, accept it.
        const accepted = await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: "ACCEPTED", respondedAt: new Date() },
        });
        await createNotification({
          recipientId: target.id,
          actorId: me.id,
          type: "FRIEND_ACCEPTED",
          title: "Friend request accepted",
          body: `${me.name} accepted your friend request`,
          entityType: "FRIENDSHIP",
          entityId: accepted.id,
        });
        return NextResponse.json({ status: "accepted", friendshipId: accepted.id });
      }
      // DECLINED previously → allow a fresh request from me.
      const renewed = await prisma.friendship.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          requesterId: me.id,
          addresseeId: target.id,
          respondedAt: null,
          createdAt: new Date(),
        },
      });
      await createNotification({
        recipientId: target.id,
        actorId: me.id,
        type: "FRIEND_REQUEST",
        title: "New friend request",
        body: `${me.name} wants to be friends`,
        entityType: "FRIENDSHIP",
        entityId: renewed.id,
      });
      return NextResponse.json({ status: "pending", friendshipId: renewed.id });
    }

    const created = await prisma.friendship.create({
      data: {
        requesterId: me.id,
        addresseeId: target.id,
        status: "PENDING",
        pairKey: key,
      },
    });
    await createNotification({
      recipientId: target.id,
      actorId: me.id,
      type: "FRIEND_REQUEST",
      title: "New friend request",
      body: `${me.name} wants to be friends`,
      entityType: "FRIENDSHIP",
      entityId: created.id,
    });

    return NextResponse.json({ status: "pending", friendshipId: created.id }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
