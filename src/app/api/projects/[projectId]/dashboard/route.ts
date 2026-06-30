import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
} from "@/lib/authz";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/task-meta";
import type { Priority } from "@/types";

// Real hex (recharts applies `fill` as an SVG attribute, which doesn't resolve CSS vars).
const PRIORITY_HEX: Record<Priority, string> = {
  URGENT: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
  NONE: "#8a8a8a",
};

// GET /api/projects/[projectId]/dashboard — aggregated reporting data.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;
    await requireProjectRole(me.id, projectId, "VIEWER");

    const [project, sections, milestones, members, tasks, worklogs] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { owner: { select: { id: true, name: true, avatar: true } } },
      }),
      prisma.section.findMany({
        where: { projectId },
        orderBy: { position: "asc" },
        select: { id: true, name: true },
      }),
      prisma.milestone.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, color: true },
      }),
      prisma.projectMember.findMany({
        where: { projectId },
        select: { user: { select: { id: true, name: true, avatar: true } } },
      }),
      prisma.task.findMany({
        where: { projectId, deletedAt: null, parentTaskId: null },
        select: {
          sectionId: true,
          priority: true,
          taskType: true,
          assigneeId: true,
          completedAt: true,
          dueDate: true,
          estimateMinutes: true,
          billable: true,
          milestoneId: true,
        },
      }),
      prisma.timeLog.groupBy({
        by: ["userId"],
        where: { task: { projectId } },
        _sum: { durationSeconds: true },
      }),
    ]);

    const memberById = new Map(members.map((m) => [m.user.id, m.user]));
    if (project?.owner) memberById.set(project.owner.id, project.owner);
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday);
    endToday.setDate(endToday.getDate() + 1);

    // Totals
    let open = 0,
      completed = 0,
      overdue = 0,
      dueToday = 0,
      estimateMinutes = 0,
      billable = 0;
    for (const t of tasks) {
      const isDone = !!t.completedAt;
      if (isDone) completed++;
      else open++;
      if (t.estimateMinutes) estimateMinutes += t.estimateMinutes;
      if (t.billable) billable++;
      if (!isDone && t.dueDate) {
        const d = new Date(t.dueDate);
        if (d < startToday) overdue++;
        else if (d >= startToday && d < endToday) dueToday++;
      }
    }

    // By status (section)
    const byStatus = sections.map((s) => ({
      name: s.name,
      count: tasks.filter((t) => t.sectionId === s.id).length,
    }));

    // By priority
    const byPriority = PRIORITY_ORDER.map((p) => ({
      name: PRIORITY_META[p as Priority].label,
      count: tasks.filter((t) => t.priority === p).length,
      color: PRIORITY_HEX[p as Priority],
    })).filter((x) => x.count > 0);

    // By type
    const typeMap = new Map<string, number>();
    for (const t of tasks) {
      const key = t.taskType || "Untyped";
      typeMap.set(key, (typeMap.get(key) ?? 0) + 1);
    }
    const byType = [...typeMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // By assignee (open + done counts)
    const assigneeMap = new Map<string, number>();
    let unassigned = 0;
    for (const t of tasks) {
      if (!t.assigneeId) unassigned++;
      else assigneeMap.set(t.assigneeId, (assigneeMap.get(t.assigneeId) ?? 0) + 1);
    }
    const byAssignee = [...assigneeMap.entries()]
      .map(([id, count]) => ({
        name: memberById.get(id)?.name ?? "Unknown",
        avatar: memberById.get(id)?.avatar ?? null,
        count,
      }))
      .sort((a, b) => b.count - a.count);
    if (unassigned > 0)
      byAssignee.push({ name: "Unassigned", avatar: null, count: unassigned });

    // Milestone progress
    const milestoneStats = milestones.map((m) => {
      const linked = tasks.filter((t) => t.milestoneId === m.id);
      const done = linked.filter((t) => t.completedAt).length;
      return {
        name: m.name,
        color: m.color,
        done,
        total: linked.length,
        pct: linked.length ? Math.round((done / linked.length) * 100) : 0,
      };
    });

    // Worklog leaderboard + total
    let loggedSeconds = 0;
    const leaderboard = worklogs
      .map((w) => {
        const secs = w._sum.durationSeconds ?? 0;
        loggedSeconds += secs;
        return {
          name: memberById.get(w.userId)?.name ?? "Unknown",
          avatar: memberById.get(w.userId)?.avatar ?? null,
          seconds: secs,
        };
      })
      .sort((a, b) => b.seconds - a.seconds);

    return NextResponse.json({
      totals: { total: tasks.length, open, completed, overdue, dueToday },
      estimateMinutes,
      loggedSeconds,
      billable,
      byStatus,
      byPriority,
      byType,
      byAssignee,
      milestones: milestoneStats,
      leaderboard,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
