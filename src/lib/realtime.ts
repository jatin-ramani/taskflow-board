import prisma from "@/lib/prisma";

/**
 * In-process SSE event bus + presence. Works on a single Node server
 * (next dev / next start) — the free, zero-infra real-time approach.
 *
 * State is pinned to globalThis so HMR / module reloads don't fork the bus.
 */

export interface Conn {
  send: (data: string) => void;
}

type Bus = Map<string, Set<Conn>>;

const g = globalThis as unknown as {
  __tf_bus?: Bus;
  __tf_heartbeat?: ReturnType<typeof setInterval>;
};

const bus: Bus = g.__tf_bus ?? (g.__tf_bus = new Map());

export type RealtimeEvent =
  | { type: "notification" }
  | { type: "message"; conversationId: string }
  | { type: "presence"; userId: string; online: boolean };

/** Push an event to every active connection of a user. */
export function publishToUser(userId: string, payload: RealtimeEvent) {
  const conns = bus.get(userId);
  if (!conns || conns.size === 0) return;
  const frame = `data: ${JSON.stringify(payload)}\n\n`;
  for (const c of conns) {
    try {
      c.send(frame);
    } catch {
      /* dead connection; cleaned up on cancel */
    }
  }
}

export async function addConnection(userId: string, conn: Conn) {
  let set = bus.get(userId);
  const wasOffline = !set || set.size === 0;
  if (!set) {
    set = new Set();
    bus.set(userId, set);
  }
  set.add(conn);
  ensureHeartbeat();
  if (wasOffline) await setPresence(userId, true);
}

export async function removeConnection(userId: string, conn: Conn) {
  const set = bus.get(userId);
  if (!set) return;
  set.delete(conn);
  if (set.size === 0) {
    bus.delete(userId);
    await setPresence(userId, false);
  }
}

async function setPresence(userId: string, online: boolean) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    for (const f of friendships) {
      const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId;
      publishToUser(friendId, { type: "presence", userId, online });
    }
  } catch {
    /* ignore presence failures */
  }
}

/** Keep connected users' lastSeenAt fresh so REST isOnline() stays accurate. */
function ensureHeartbeat() {
  if (g.__tf_heartbeat) return;
  g.__tf_heartbeat = setInterval(async () => {
    const ids = [...bus.keys()];
    if (ids.length === 0) return;
    try {
      await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { lastSeenAt: new Date() },
      });
    } catch {
      /* ignore */
    }
  }, 60_000);
}
