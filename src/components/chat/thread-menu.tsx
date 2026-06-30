"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Timer, Eraser, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

const DISAPPEAR_OPTIONS = [
  { label: "Off", value: null as number | null },
  { label: "1 hour", value: 3600 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
];

export function ThreadMenu({
  conversationId,
  disappearSeconds,
  onChanged,
}: {
  conversationId: string;
  disappearSeconds: number | null;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function setDisappear(value: number | null) {
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disappearSeconds: value }),
    });
    onChanged();
    setOpen(false);
    toast(value ? "Disappearing messages on" : "Disappearing messages off", "success");
  }

  async function clearHistory() {
    if (!confirm("Clear this conversation's history for you?")) return;
    await fetch(`/api/conversations/${conversationId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    onChanged();
    setOpen(false);
    toast("History cleared", "success");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-text"
        aria-label="Conversation options"
      >
        <MoreVertical size={17} />
      </button>

      {open && (
        <div className="animate-slide-up absolute right-0 top-[calc(100%+6px)] z-30 w-56 overflow-hidden rounded-md border border-border bg-overlay p-1 shadow-popover">
          <p className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
            <Timer size={12} /> Disappearing messages
          </p>
          {DISAPPEAR_OPTIONS.map((o) => {
            const active = (disappearSeconds ?? null) === o.value;
            return (
              <button
                key={o.label}
                onClick={() => setDisappear(o.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-surface",
                  active ? "text-text" : "text-muted"
                )}
              >
                {o.label}
                {active && <Check size={14} className="text-accent" />}
              </button>
            );
          })}

          <div className="my-1 h-px bg-border" />
          <button
            onClick={clearHistory}
            className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-[13px] text-muted transition-colors hover:bg-surface hover:text-danger"
          >
            <Eraser size={14} /> Clear history
          </button>
        </div>
      )}
    </div>
  );
}
