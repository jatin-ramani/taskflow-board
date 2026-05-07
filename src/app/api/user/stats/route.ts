import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [tasksCompleted, projectsCount, totalTime, recentTasks] = await Promise.all([
      prisma.task.count({ where: { assigneeId: session.user.id, status: "DONE" } }),
      prisma.project.count({ where: { members: { some: { userId: session.user.id } } } }),
      prisma.timeEntry.aggregate({ 
        where: { userId: session.user.id, isRunning: false },
        _sum: { duration: true }
      }),
      prisma.task.findMany({
        where: { assigneeId: session.user.id, status: { not: "DONE" } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { project: { select: { name: true, color: true } } }
      })
    ]);

    return NextResponse.json({
      tasksCompleted,
      projectsCount,
      totalTime: totalTime._sum.duration || 0,
      recentTasks
    });
  } catch (error) {
    console.error("Profile stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
