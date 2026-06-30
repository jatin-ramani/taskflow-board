"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🙂", "😉",
  "😊", "😍", "😘", "😋", "😎", "🤩", "🥳", "😏", "😴", "🤔",
  "😮", "😯", "😢", "😭", "😡", "😱", "🤨", "🙄", "😬", "🥺",
  "👍", "👎", "👏", "🙌", "🙏", "👌", "✌️", "🤝", "💪", "👋",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "✨", "🔥",
  "⭐", "💯", "🎉", "🎊", "🚀", "✅", "❌", "⚡", "💡", "🎯",
];

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="grid w-[244px] grid-cols-8 gap-0.5 p-2">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          className="flex h-7 w-7 items-center justify-center rounded text-[18px] transition-colors hover:bg-surface"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

/** Button that toggles an emoji popover. */
export function EmojiPopover({
  onPick,
  children,
  align = "left",
}: {
  onPick: (emoji: string) => void;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
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

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}>
        {children}
      </button>
      {open && (
        <div
          className={cn(
            "animate-slide-up absolute bottom-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-border bg-overlay shadow-popover",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <EmojiPicker
            onPick={(e) => {
              onPick(e);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
