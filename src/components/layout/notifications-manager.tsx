"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { onRealtime } from "./realtime";
import { setFaviconBadge } from "@/lib/favicon";

/**
 * Keeps the favicon badge in sync with total unread (notifications + messages)
 * and raises a browser notification when a message/update arrives while the tab
 * isn't focused. Works on desktop and mobile browsers while the app is open.
 */
export function NotificationsManager() {
  const { status } = useSession();
  const lastNotify = useRef(0);

  useEffect(() => {
    if (status !== "authenticated") return;

    const ask = () => {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    };
    ask();
    // Some browsers only allow the prompt after a user gesture.
    window.addEventListener("pointerdown", ask, { once: true });

    let cancelled = false;
    async function refreshCounts() {
      try {
        const [n, c] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/conversations"),
        ]);
        let total = 0;
        if (n.ok) total += (await n.json()).unreadCount ?? 0;
        if (c.ok) {
          const convos: { unreadCount: number }[] = await c.json();
          total += convos.reduce((s, x) => s + (x.unreadCount || 0), 0);
        }
        if (!cancelled) setFaviconBadge(total);
      } catch {
        /* ignore */
      }
    }
    refreshCounts();

    const off = onRealtime((p) => {
      refreshCounts();
      const isMsg = p.type === "message";
      if (
        (isMsg || p.type === "notification") &&
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const now = Date.now();
        if (now - lastNotify.current < 1500) return; // throttle bursts
        lastNotify.current = now;
        const notif = new Notification(isMsg ? "New message" : "TaskFlow", {
          body: isMsg ? "You have a new message" : "You have a new update",
          icon: "/logo-light.svg",
          tag: isMsg ? `msg-${p.conversationId ?? ""}` : "notif",
        });
        notif.onclick = () => {
          window.focus();
          window.location.href = isMsg ? "/messages" : "/inbox";
          notif.close();
        };
      }
    });

    const onFocus = () => refreshCounts();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      off();
      window.removeEventListener("pointerdown", ask);
      window.removeEventListener("focus", onFocus);
    };
  }, [status]);

  return null;
}
