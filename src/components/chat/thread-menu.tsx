"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Ghost, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export function ThreadMenu({
  conversationId,
  vanishMode,
  onChanged,
}: {
  conversationId: string;
  vanishMode: boolean;
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

  async function toggleVanish() {
    const next = !vanishMode;
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vanishMode: next }),
    });
    onChanged();
    setOpen(false);
    toast(next ? "Vanish mode on" : "Vanish mode off — chat restored", "success");
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
        <div className="animate-slide-up absolute right-0 top-[calc(100%+6px)] z-30 w-64 overflow-hidden rounded-md border border-border bg-overlay p-1 shadow-popover">
          {/* Vanish mode toggle */}
          <button
            onClick={toggleVanish}
            className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left transition-colors hover:bg-surface"
          >
            <Ghost size={16} className={vanishMode ? "text-accent" : "text-faint"} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">Vanish mode</span>
              <span className="block text-[11px] text-faint">
                New messages disappear when you close the chat
              </span>
            </span>
            <span
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                vanishMode ? "bg-accent" : "bg-border-strong"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  vanishMode ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </span>
          </button>

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
