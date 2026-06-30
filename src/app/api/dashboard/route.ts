import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse } from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";

// GET /api/dashboard — Superworks-style "My Dashboard" aggregation.
export async function GET() {
  try {
    const me = await requireUser();

    const projects = await prisma.project.findMany({
      where: { OR: [{ ownerId: me.id }, { members: { some: { userId: me.id } } }] },
      select: { id: true, name: true, color: true, dueDate: true },
      orderBy: { updatedAt: "desc" },
    });
    const projectIds = projects.map((p) => p.id);
    const pById = new Map(projects.map((p) => [p.id, p]));

    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday);
    endToday.setDate(endToday.getDate() + 1);
    const since = new Date(startToday);
    since.setDate(since.getDate() - 13); // 14-day activity window

    const baseWhere = { projectId: { in: projectIds }, deletedAt: null, parentTaskId: null };

    const [
      totals,
      dones,
      totalTasks,
      completedTasks,
      overdueTasks,
      todayTasks,
      overdueMine,
      completedForLeaders,
      activityRows,
    ] = await Promise.all([
      prisma.task.groupBy({ by: ["projectId"], where: baseWhere, _count: { _all: true } }),
      prisma.task.groupBy({
        by: ["projectId"],
        where: { ...baseWhere, completedAt: { not: null } },
        _count: { _all: true },
      }),
      prisma.task.count({ where: baseWhere }),
      prisma.task.count({ where: { ...baseWhere, completedAt: { not: null } } }),
      prisma.task.count({
        where: { ...baseWhere, completedAt: null, dueDate: { lt: startToday } },
      }),
      prisma.task.findMany({
        where: {
          assigneeId: me.id,
          deletedAt: null,
          completedAt: null,
          dueDate: { gte: startToday, lt: endToday },
        },
        select: { id: true, title: true, project: { select: { id: true, name: true, color: true } } },
        take: 8,
      }),
      prisma.task.findMany({
        where: {
          assigneeId: me.id,
          deletedAt: null,
          completedAt: null,
          dueDate: { lt: startToday },
        },
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          title: true,
          dueDate: true,
          project: { select: { id: true, name: true, color: true } },
        },
        take: 8,
      }),
      prisma.task.groupBy({
        by: ["assigneeId"],
        where: { ...baseWhere, completedAt: { not: null }, assigneeId: { not: null } },
        _count: { _all: true },
      }),
      prisma.task.findMany({
        where: { ...baseWhere, completedAt: { gte: since } },
        select: { completedAt: true },
      }),
    ]);

    const totalMap = new Map(totals.map((t) => [t.projectId, t._count._all]));
    const doneMap = new Map(dones.map((t) => [t.projectId, t._count._all]));

    // KPIs
    const pendingTasks = totalTasks - completedTasks;

    // Project progress views
    const withProgress = projects.map((p) => {
      const total = totalMap.get(p.id) ?? 0;
      const done = doneMap.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        dueDate: p.dueDate ? p.dueDate.toISOString() : null,
        total,
        done,
        pct: total ? Math.round((done / total) * 1000) / 10 : 0,
      };
    });
    const activeProjects = withProgress.filter((p) => p.total > 0).slice(0, 6);
    const overdueProjects = withProgress.filter(
      (p) => p.dueDate && new Date(p.dueDate) < startToday && p.pct < 100
    );
    const projectsLaunch = withProgress
      .filter((p) => p.dueDate && new Date(p.dueDate) >= startToday)
      .map((p) => ({
        ...p,
        daysToGo: Math.ceil((new Date(p.dueDate!).getTime() - now.getTime()) / 86400000),
      }))
      .sort((a, b) => a.daysToGo - b.daysToGo)
      .slice(0, 4);

    // Leaderboard — points = completed tasks * 50
    const leaderIds = completedForLeaders.map((r) => r.assigneeId!).filter(Boolean);
    const users = leaderIds.length
      ? await prisma.user.findMany({
          where: { id: { in: leaderIds } },
          select: publicUserSelect,
        })
      : [];
    const uById = new Map(users.map((u) => [u.id, u]));
    const leaderboard = completedForLeaders
      .map((r) => ({ user: uById.get(r.assigneeId!), points: r._count._all * 50 }))
      .filter((l) => l.user)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
    const myEntry = completedForLeaders.find((r) => r.assigneeId === me.id);
    const myPoints = (myEntry?._count._all ?? 0) * 50;
    const myRank =
      leaderboard.findIndex((l) => l.user?.id === me.id) + 1 || null;

    // Task activity — completed per day, last 14 days
    const buckets = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      buckets.set(`${d.getMonth() + 1}/${d.getDate()}`, 0);
    }
    for (const row of activityRows) {
      if (!row.completedAt) continue;
      const d = new Date(row.completedAt);
      const k = `${d.getMonth() + 1}/${d.getDate()}`;
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    const taskActivity = [...buckets.entries()].map(([label, count]) => ({ label, count }));

    return NextResponse.json({
      kpis: {
        totalProjects: projects.length,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
      },
      leaderboard,
      myPoints,
      myRank,
      taskActivity,
      tasksForToday: todayTasks,
      overallDueTasks: overdueMine.map((t) => ({
        ...t,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      })),
      activeProjects,
      overdueProjects,
      projectsLaunch,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
