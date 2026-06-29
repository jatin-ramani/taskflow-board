import prisma from "@/lib/prisma";

export interface ActivityInput {
  action: string;
  userId: string;
  taskId?: string | null;
  projectId?: string | null;
  details?: unknown;
}

/** Append an audit-trail entry. `details` is JSON-stringified. */
export async function logActivity(input: ActivityInput) {
  return prisma.activity.create({
    data: {
      action: input.action,
      userId: input.userId,
      taskId: input.taskId ?? null,
      projectId: input.projectId ?? null,
      details: input.details ? JSON.stringify(input.details) : null,
    },
  });
}
