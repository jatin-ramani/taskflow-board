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

// GET /api/me — current user's full profile + stats + rich related content
// (project progress, active goals, recent activity) for the profile page.
export async function GET() {
  try {
    const me = await requireUser();

    const myProjects = await prisma.project.findMany({
      where: { OR: [{ ownerId: me.id }, { members: { some: { userId: me.id } } }] },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, color: true },
    });
    const projectIds = myProjects.map((p) => p.id);
    const baseWhere = { projectId: { in: projectIds }, deletedAt: null, parentTaskId: null };

    const [
      user,
      tasksDone,
      tasksOpen,
      friends,
      goalsCount,
      totals,
      dones,
      activeGoals,
      recentActivity,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: me.id }, select: profileSelect }),
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
      prisma.task.groupBy({ by: ["projectId"], where: baseWhere, _count: { _all: true } }),
      prisma.task.groupBy({
        by: ["projectId"],
        where: { ...baseWhere, completedAt: { not: null } },
        _count: { _all: true },
      }),
      prisma.goal.findMany({
        where: { ownerId: me.id, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, progress: true, targetDate: true },
      }),
      prisma.activity.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          createdAt: true,
          task: { select: { title: true } },
          project: { select: { name: true, color: true } },
        },
      }),
    ]);

    const totalMap = new Map(totals.map((t) => [t.projectId, t._count._all]));
    const doneMap = new Map(dones.map((t) => [t.projectId, t._count._all]));
    const projects = myProjects.slice(0, 5).map((p) => {
      const total = totalMap.get(p.id) ?? 0;
      const done = doneMap.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        total,
        done,
        pct: total ? Math.round((done / total) * 100) : 0,
      };
    });

    return NextResponse.json({
      ...user,
      stats: {
        projects: myProjects.length,
        tasksDone,
        tasksOpen,
        friends,
        goals: goalsCount,
      },
      projects,
      goals: activeGoals.map((g) => ({
        ...g,
        targetDate: g.targetDate ? g.targetDate.toISOString() : null,
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        createdAt: a.createdAt.toISOString(),
        taskTitle: a.task?.title ?? null,
        projectName: a.project?.name ?? null,
        projectColor: a.project?.color ?? null,
      })),
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
