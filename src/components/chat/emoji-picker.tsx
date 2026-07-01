"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

/** Button that toggles an emoji popover — portal-positioned so it flips below
 *  when there's no room above and is never clipped by the chat scroll area. */
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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const W = 260;
  const H = 210;

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    let left = align === "right" ? r.right - W : r.left;
    left = Math.min(Math.max(8, left), window.innerWidth - W - 8);
    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    let top = spaceAbove >= H + 8 || spaceAbove >= spaceBelow ? r.top - H - 6 : r.bottom + 6;
    top = Math.min(Math.max(8, top), window.innerHeight - H - 8);
    setCoords({ top, left });
  }

  function toggle() {
    if (!open) place();
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node))
        return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle}>
        {children}
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={popRef}
            data-portal-popover
            style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 70 }}
            className="animate-slide-up overflow-hidden rounded-lg border border-border bg-overlay shadow-popover"
          >
            <EmojiPicker
              onPick={(e) => {
                onPick(e);
                setOpen(false);
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}
