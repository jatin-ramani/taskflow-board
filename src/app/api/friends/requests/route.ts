import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse } from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";

// GET /api/friends/requests — pending requests, split into incoming/outgoing.
export async function GET() {
  try {
    const me = await requireUser();

    const pending = await prisma.friendship.findMany({
      where: {
        status: "PENDING",
        OR: [{ requesterId: me.id }, { addresseeId: me.id }],
      },
      select: {
        id: true,
        createdAt: true,
        requesterId: true,
        requester: { select: publicUserSelect },
        addressee: { select: publicUserSelect },
      },
      orderBy: { createdAt: "desc" },
    });

    const incoming = pending
      .filter((f) => f.requesterId !== me.id)
      .map((f) => ({
        friendshipId: f.id,
        user: f.requester,
        direction: "incoming" as const,
        createdAt: f.createdAt,
      }));

    const outgoing = pending
      .filter((f) => f.requesterId === me.id)
      .map((f) => ({
        friendshipId: f.id,
        user: f.addressee,
        direction: "outgoing" as const,
        createdAt: f.createdAt,
      }));

    return NextResponse.json({ incoming, outgoing });
  } catch (err) {
    return toErrorResponse(err);
  }
}
