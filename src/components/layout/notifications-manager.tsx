"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { onRealtime } from "./realtime";
import { setFaviconBadge } from "@/lib/favicon";

/**
 * Keeps the favicon badge in sync with total unread (notifications + messages)
 * and raises a browser notification when a NEW message/update is detected while
 * the tab isn't focused.
 *
 * Uses polling in addition to SSE so it works on serverless (Vercel), where the
 * in-process SSE bus can't deliver events across function instances.
 */
export function NotificationsManager() {
  const { status } = useSession();
  const prev = useRef<{ notif: number; msg: number } | null>(null);
  const lastNotify = useRef(0);

  useEffect(() => {
    if (status !== "authenticated") return;

    const ask = () => {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    };
    ask();
    window.addEventListener("pointerdown", ask, { once: true });

    let cancelled = false;

    async function refresh() {
      try {
        const [n, c] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/conversations"),
        ]);
        let notif = 0;
        let msg = 0;
        if (n.ok) notif = (await n.json()).unreadCount ?? 0;
        if (c.ok) {
          const convos: { unreadCount: number }[] = await c.json();
          msg = convos.reduce((s, x) => s + (x.unreadCount || 0), 0);
        }
        if (cancelled) return;

        setFaviconBadge(notif + msg);

        const p = prev.current;
        // Only notify on an INCREASE (never on the first load / refresh).
        if (
          p &&
          "Notification" in window &&
          Notification.permission === "granted" &&
          document.hidden
        ) {
          const now = Date.now();
          if (now - lastNotify.current > 1500) {
            if (msg > p.msg) {
              lastNotify.current = now;
              showNotif("message");
            } else if (notif > p.notif) {
              lastNotify.current = now;
              showNotif("notification");
            }
          }
        }
        prev.current = { notif, msg };
      } catch {
        /* ignore */
      }
    }

    refresh();
    const off = onRealtime(() => refresh());
    const poll = setInterval(refresh, 12000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      off();
      clearInterval(poll);
      window.removeEventListener("pointerdown", ask);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [status]);

  return null;
}

function showNotif(kind: "message" | "notification") {
  const isMsg = kind === "message";
  const notif = new Notification(isMsg ? "New message" : "TaskFlow", {
    body: isMsg ? "You have a new message" : "You have a new update",
    icon: "/favicon/android-chrome-192x192.png",
    badge: "/favicon/favicon-32x32.png",
    tag: kind,
  });
  notif.onclick = () => {
    window.focus();
    window.location.href = isMsg ? "/messages" : "/inbox";
    notif.close();
  };
}
