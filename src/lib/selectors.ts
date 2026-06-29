import { Prisma } from "@prisma/client";

/**
 * The only user fields ever sent to clients. Never includes password/email
 * unless a route explicitly needs email. Reuse everywhere to avoid leaks.
 */
export const publicUserSelect = {
  id: true,
  name: true,
  publicId: true,
  username: true,
  avatar: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

/** Fields needed to render a task card on a board / list. */
export const taskCardSelect = {
  id: true,
  title: true,
  priority: true,
  position: true,
  dueDate: true,
  startDate: true,
  completedAt: true,
  isFavorite: true,
  tags: true,
  sectionId: true,
  projectId: true,
  goalId: true,
  assignee: { select: publicUserSelect },
  _count: { select: { subtasks: true, comments: true } },
} satisfies Prisma.TaskSelect;

export type TaskCard = Prisma.TaskGetPayload<{ select: typeof taskCardSelect }>;
