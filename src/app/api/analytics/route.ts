import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Get user's projects
    const userProjects = await prisma.project.findMany({ where: { OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }] }, select: { id: true } });
    const projectIds = userProjects.map((p: { id: string }) => p.id);

    const [totalTasks, completedTasks, overdueTasks, completedToday, activeTimers, todayTimeEntries, weekTimeEntries, recentActivities, tasksByStatus] = await Promise.all([
      prisma.task.count({ where: { projectId: { in: projectIds }, parentTaskId: null } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: "DONE", parentTaskId: null } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: { not: "DONE" }, dueDate: { lt: now }, parentTaskId: null } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: "DONE", completedAt: { gte: startOfDay }, parentTaskId: null } }),
      prisma.timeEntry.count({ where: { task: { projectId: { in: projectIds } }, isRunning: true } }),
      prisma.timeEntry.findMany({ where: { task: { projectId: { in: projectIds } }, startTime: { gte: startOfDay }, isRunning: false }, select: { duration: true } }),
      prisma.timeEntry.findMany({ where: { task: { projectId: { in: projectIds } }, startTime: { gte: startOfWeek }, isRunning: false }, select: { duration: true } }),
      prisma.activity.findMany({ where: { projectId: { in: projectIds } }, include: { user: { select: { id: true, name: true, avatar: true } }, task: { select: { id: true, title: true } }, project: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 15 }),

      prisma.task.groupBy({ by: ["status"], where: { projectId: { in: projectIds }, parentTaskId: null }, _count: true }),
    ]);

    const totalTimeToday = todayTimeEntries.reduce((sum: number, e: { duration: number | null }) => sum + (e.duration || 0), 0);
    const totalTimeWeek = weekTimeEntries.reduce((sum: number, e: { duration: number | null }) => sum + (e.duration || 0), 0);
    const activeTasks = totalTasks - completedTasks;

    const statusBreakdown = tasksByStatus.reduce((acc: Record<string, number>, s: { status: string; _count: number }) => { acc[s.status] = s._count; return acc; }, {} as Record<string, number>);

    return NextResponse.json({
      stats: { totalTasks, completedTasks, overdueTasks, activeTasks, completedToday, activeTimers, totalTimeToday, totalTimeWeek },
      statusBreakdown,
      recentActivities,
    });
  } catch (error) {
    console.error("GET analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
