import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse, HttpError } from "@/lib/authz";

// DELETE /api/friends/[id] — unfriend, or cancel an outgoing request.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;

    const friendship = await prisma.friendship.findUnique({
      where: { id },
      select: { id: true, requesterId: true, addresseeId: true },
    });
    if (!friendship) throw new HttpError(404, "Not found");
    if (friendship.requesterId !== me.id && friendship.addresseeId !== me.id) {
      throw new HttpError(403, "Not allowed");
    }

    await prisma.friendship.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
