import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse, HttpError } from "@/lib/authz";
import { friendRespondSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";

// POST /api/friends/[id]/respond — accept or decline an incoming request.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = friendRespondSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship) throw new HttpError(404, "Request not found");
    if (friendship.addresseeId !== me.id) {
      throw new HttpError(403, "This request isn't addressed to you");
    }
    if (friendship.status !== "PENDING") {
      throw new HttpError(400, "This request has already been handled");
    }

    const accept = parsed.data.action === "accept";

    const updated = await prisma.friendship.update({
      where: { id },
      data: {
        status: accept ? "ACCEPTED" : "DECLINED",
        respondedAt: new Date(),
      },
    });

    // Resolve the originating FRIEND_REQUEST notification (mark it read).
    await prisma.notification.updateMany({
      where: { recipientId: me.id, entityType: "FRIENDSHIP", entityId: id },
      data: { isRead: true },
    });

    if (accept) {
      await createNotification({
        recipientId: friendship.requesterId,
        actorId: me.id,
        type: "FRIEND_ACCEPTED",
        title: "Friend request accepted",
        body: `${me.name} accepted your friend request`,
        entityType: "FRIENDSHIP",
        entityId: updated.id,
      });
    }

    return NextResponse.json({ status: updated.status });
  } catch (err) {
    return toErrorResponse(err);
  }
}
