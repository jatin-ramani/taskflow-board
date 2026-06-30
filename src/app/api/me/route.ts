import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse, HttpError } from "@/lib/authz";
import { updateProfileSchema } from "@/lib/validations";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatar: true,
  bio: true,
  publicId: true,
  createdAt: true,
} as const;

// GET /api/me — current user's full profile + lightweight stats.
export async function GET() {
  try {
    const me = await requireUser();
    const [user, owned, memberOf, tasksDone, tasksOpen, friends, goals] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: me.id }, select: profileSelect }),
        prisma.project.count({ where: { ownerId: me.id } }),
        prisma.projectMember.count({ where: { userId: me.id } }),
        prisma.task.count({
          where: { assigneeId: me.id, deletedAt: null, completedAt: { not: null } },
        }),
        prisma.task.count({
          where: { assigneeId: me.id, deletedAt: null, completedAt: null },
        }),
        prisma.friendship.count({
          where: {
            status: "ACCEPTED",
            OR: [{ requesterId: me.id }, { addresseeId: me.id }],
          },
        }),
        prisma.goal.count({ where: { ownerId: me.id } }),
      ]);

    return NextResponse.json({
      ...user,
      stats: {
        projects: owned + memberOf,
        tasksDone,
        tasksOpen,
        friends,
        goals,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PATCH /api/me — update name, username, bio, or avatar.
export async function PATCH(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const d = parsed.data;

    const data: Record<string, unknown> = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.bio !== undefined) data.bio = d.bio || null;
    if (d.avatar !== undefined) data.avatar = d.avatar || null;
    if (d.username !== undefined) {
      if (d.username) {
        // App-level uniqueness (no DB unique index on this nullable field).
        const taken = await prisma.user.findFirst({
          where: { username: d.username, NOT: { id: me.id } },
          select: { id: true },
        });
        if (taken) throw new HttpError(409, "That username is already taken");
        data.username = d.username;
      } else {
        data.username = { unset: true };
      }
    }

    const user = await prisma.user.update({
      where: { id: me.id },
      data,
      select: profileSelect,
    });
    return NextResponse.json(user);
  } catch (err) {
    return toErrorResponse(err);
  }
}
