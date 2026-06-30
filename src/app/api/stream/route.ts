import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { addConnection, removeConnection, type Conn } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/stream — Server-Sent Events: notifications, messages, presence.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;
  const encoder = new TextEncoder();

  let conn: Conn;
  let ping: ReturnType<typeof setInterval>;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(ping);
    removeConnection(userId, conn);
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          cleanup();
        }
      };
      conn = { send };
      send(`: connected\n\n`);
      addConnection(userId, conn);

      // Keep-alive comment so proxies/browsers don't drop the connection.
      ping = setInterval(() => send(`: ping\n\n`), 25_000);

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
