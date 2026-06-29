import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse, HttpError } from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";
import { userSearchSchema } from "@/lib/validations";
import { pairKey } from "@/lib/utils";

// GET /api/users/search?q= — find people by friend code, @username, or name.
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const parsed = userSearchSchema.safeParse({ q: searchParams.get("q") ?? "" });
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const q = parsed.data.q.trim();
    const handle = q.replace(/^@/, "").toLowerCase();

    const users = await prisma.user.findMany({
      where: {
        id: { not: me.id },
        OR: [
          { publicId: q.toUpperCase() },
          { username: handle },
          { username: { contains: handle, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: publicUserSelect,
      take: 12,
    });

    // Annotate each result with the relationship status to the current user.
    const friendships = users.length
      ? await prisma.friendship.findMany({
          where: { pairKey: { in: users.map((u) => pairKey(me.id, u.id)) } },
          select: { id: true, pairKey: true, status: true, requesterId: true },
        })
      : [];

    const results = users.map((user) => {
      const f = friendships.find((fr) => fr.pairKey === pairKey(me.id, user.id));
      let status: "none" | "friends" | "incoming" | "outgoing" | "blocked" = "none";
      if (f) {
        if (f.status === "ACCEPTED") status = "friends";
        else if (f.status === "PENDING")
          status = f.requesterId === me.id ? "outgoing" : "incoming";
        else if (f.status === "BLOCKED") status = "blocked";
      }
      return { user, status, friendshipId: f?.id ?? null };
    });

    return NextResponse.json(results);
  } catch (err) {
    return toErrorResponse(err);
  }
}
