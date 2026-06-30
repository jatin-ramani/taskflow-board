"use client";

import { useEffect, useReducer, useState } from "react";

export interface RunningTimer {
  taskId: string;
  projectId: string;
  title: string;
  startedAt: number; // epoch ms
}

const KEY = "taskflow:timer";
let current: RunningTimer | null = null;
let loaded = false;
const subs = new Set<() => void>();

function ensure() {
  if (loaded || typeof window === "undefined") return;
  try {
    const s = localStorage.getItem(KEY);
    current = s ? (JSON.parse(s) as RunningTimer) : null;
  } catch {
    current = null;
  }
  loaded = true;
}
function persist() {
  if (typeof window === "undefined") return;
  try {
    if (current) localStorage.setItem(KEY, JSON.stringify(current));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
function emit() {
  subs.forEach((cb) => cb());
}

export function getTimer(): RunningTimer | null {
  ensure();
  return current;
}

export function startTimer(t: Omit<RunningTimer, "startedAt">) {
  ensure();
  if (current) return; // strict: only one timer at a time
  current = { ...t, startedAt: Date.now() };
  persist();
  emit();
}

// Stop the running timer and log its elapsed time (the only path to a work log).
export async function stopAndLogTimer(): Promise<{ taskId: string; seconds: number } | null> {
  ensure();
  const t = current;
  if (!t) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - t.startedAt) / 1000));
  current = null;
  persist();
  emit();
  if (seconds >= 1) {
    try {
      await fetch(`/api/tasks/${t.taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds: seconds }),
      });
    } catch {
      /* ignore */
    }
  }
  return { taskId: t.taskId, seconds };
}

export function subscribeTimer(cb: () => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

/** Reactive access to the running timer (re-renders on start/stop, cross-tab). */
export function useRunningTimer(): RunningTimer | null {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    ensure();
    force();
    const off = subscribeTimer(force);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        loaded = false;
        ensure();
        force();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      off();
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return getTimer();
}

/** Live elapsed seconds, ticking each second while running. */
export function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt == null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function isInProgress(sectionName: string | undefined | null): boolean {
  return !!sectionName && sectionName.trim().toLowerCase().includes("progress");
}
