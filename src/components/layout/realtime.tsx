"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { refreshSidebar } from "./app-sidebar";

export const REALTIME_EVENT = "taskflow:realtime";

export interface RealtimePayload {
  type: "notification" | "message" | "presence";
  conversationId?: string;
  userId?: string;
  online?: boolean;
}

/**
 * Opens one SSE connection for the signed-in user and re-broadcasts each event
 * as a window CustomEvent so any page can react. Also nudges the sidebar badges.
 */
export function Realtime() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const es = new EventSource("/api/stream");

    es.onmessage = (e) => {
      try {
        const data: RealtimePayload = JSON.parse(e.data);
        window.dispatchEvent(new CustomEvent(REALTIME_EVENT, { detail: data }));
        if (data.type === "notification" || data.type === "message") {
          refreshSidebar();
        }
      } catch {
        /* ignore malformed frame */
      }
    };

    // EventSource auto-reconnects on error; nothing to do here.
    return () => es.close();
  }, [status]);

  return null;
}

/** Subscribe to realtime events from a component. Returns an unsubscribe fn. */
export function onRealtime(handler: (p: RealtimePayload) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<RealtimePayload>).detail);
  window.addEventListener(REALTIME_EVENT, listener);
  return () => window.removeEventListener(REALTIME_EVENT, listener);
}
