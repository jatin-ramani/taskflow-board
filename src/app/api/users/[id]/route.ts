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

// GET /api/users/[id] — public profile card (for the chat profile popup).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { ...publicUserSelect, bio: true, lastSeenAt: true },
    });
    if (!user) throw new HttpError(404, "User not found");

    const { lastSeenAt, ...rest } = user;
    return NextResponse.json({
      ...rest,
      online: isOnline(lastSeenAt),
      isFriend: id === me.id ? true : await areFriends(me.id, id),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
