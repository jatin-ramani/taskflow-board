import prisma from "@/lib/prisma";

/**
 * Recompute a goal's progress (0–100) from its non-deleted linked tasks.
 * Safe to call with a possibly-null goalId (no-op).
 */
export async function recomputeGoalProgress(goalId: string | null | undefined) {
  if (!goalId) return;
  const [total, done] = await Promise.all([
    prisma.task.count({ where: { goalId, deletedAt: null } }),
    prisma.task.count({
      where: { goalId, deletedAt: null, completedAt: { not: null } },
    }),
  ]);
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  await prisma.goal.update({ where: { id: goalId }, data: { progress } });
}
