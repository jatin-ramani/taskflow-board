import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse } from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";

// GET /api/search?q= — global search across projects, tasks, and friends.
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
    if (q.length < 1) {
      return NextResponse.json({ projects: [], tasks: [], people: [] });
    }

    const accessible = {
      OR: [{ ownerId: me.id }, { members: { some: { userId: me.id } } }],
    };

    const [projects, tasks, friendships] = await Promise.all([
      prisma.project.findMany({
        where: { ...accessible, name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true, color: true, icon: true },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          deletedAt: null,
          parentTaskId: null,
          title: { contains: q, mode: "insensitive" },
          project: accessible,
        },
        select: {
          id: true,
          title: true,
          completedAt: true,
          project: { select: { id: true, name: true, color: true } },
        },
        take: 8,
      }),
      prisma.friendship.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: me.id }, { addresseeId: me.id }],
        },
        select: {
          requesterId: true,
          requester: { select: publicUserSelect },
          addressee: { select: publicUserSelect },
        },
      }),
    ]);

    const lower = q.toLowerCase();
    const people = friendships
      .map((f) => (f.requesterId === me.id ? f.addressee : f.requester))
      .filter(
        (u) =>
          u.name.toLowerCase().includes(lower) ||
          (u.username ?? "").toLowerCase().includes(lower)
      )
      .slice(0, 5);

    return NextResponse.json({ projects, tasks, people });
  } catch (err) {
    return toErrorResponse(err);
  }
}
