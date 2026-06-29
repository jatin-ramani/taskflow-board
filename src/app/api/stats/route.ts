import { NextResponse } from "next/server";
import { startOfWeek, startOfDay, endOfDay } from "date-fns";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse } from "@/lib/authz";

// GET /api/stats — dashboard summary for the current user.
export async function GET() {
  try {
    const me = await requireUser();
    const now = new Date();
    const mine = { assigneeId: me.id, parentTaskId: null, deletedAt: null } as const;

    const [
      activeCount,
      completedCount,
      overdueCount,
      dueTodayCount,
      completedThisWeek,
      projectCount,
      friendCount,
    ] = await Promise.all([
      prisma.task.count({ where: { ...mine, completedAt: null } }),
      prisma.task.count({ where: { ...mine, completedAt: { not: null } } }),
      prisma.task.count({
        where: { ...mine, completedAt: null, dueDate: { lt: startOfDay(now) } },
      }),
      prisma.task.count({
        where: {
          ...mine,
          completedAt: null,
          dueDate: { gte: startOfDay(now), lte: endOfDay(now) },
        },
      }),
      prisma.task.count({
        where: { ...mine, completedAt: { gte: startOfWeek(now, { weekStartsOn: 1 }) } },
      }),
      prisma.project.count({
        where: { OR: [{ ownerId: me.id }, { members: { some: { userId: me.id } } }] },
      }),
      prisma.friendship.count({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: me.id }, { addresseeId: me.id }],
        },
      }),
    ]);

    return NextResponse.json({
      activeCount,
      completedCount,
      overdueCount,
      dueTodayCount,
      completedThisWeek,
      projectCount,
      friendCount,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
