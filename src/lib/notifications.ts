import prisma from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export interface NotificationInput {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

/**
 * Single entry point for creating notifications.
 * Phase 7 will also push the created notification over the SSE bus from here.
 */
export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });
}
