"use client";

import { useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import {
  SmilePlus,
  Pencil,
  Trash2,
  Check,
  X,
  Reply,
  Pin,
  PinOff,
  Ghost,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { renderMarkdown } from "@/lib/markdown";
import { QUICK_REACTIONS, EmojiPopover } from "./emoji-picker";
import { Lightbox } from "./lightbox";
import type { MessageDTO } from "@/types";

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d");
}

export function MessageList({
  messages,
  meId,
  isGroup,
  pinnedId,
  vanish = false,
  onReact,
  onEdit,
  onDelete,
  onReply,
  onPin,
  onOpenProfile,
}: {
  messages: MessageDTO[];
  meId: string;
  isGroup: boolean;
  pinnedId?: string | null;
  vanish?: boolean;
  onReact: (id: string, emoji: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: (m: MessageDTO) => void;
  onPin: (id: string) => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const [flashId, setFlashId] = useState<string | null>(null);

  function scrollToMessage(id: string) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(id);
    setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 1300);
  }

  // Mobile gestures: long-press opens the action menu, left-swipe replies.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    const id = setTimeout(() => document.addEventListener("click", close), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", close);
    };
  }, [openMenuId]);

  function touchStart(m: MessageDTO, e: React.TouchEvent) {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
    movedRef.current = false;
    if (lpTimer.current) clearTimeout(lpTimer.current);
    lpTimer.current = setTimeout(() => {
      if (!movedRef.current) {
        setOpenMenuId(m.id);
        setSwipe(null);
        navigator.vibrate?.(12);
      }
    }, 420);
  }
  function touchMove(m: MessageDTO, e: React.TouchEvent) {
    if (!touchRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > 8) {
      movedRef.current = true;
      if (lpTimer.current) clearTimeout(lpTimer.current);
    }
    if (Math.abs(dx) > Math.abs(dy) + 4 && dx < 0) {
      setSwipe({ id: m.id, dx: Math.max(dx, -90) });
    }
  }
  function touchEnd(m: MessageDTO) {
    if (lpTimer.current) clearTimeout(lpTimer.current);
    if (swipe?.id === m.id && swipe.dx <= -55) onReply(m);
    setSwipe(null);
    touchRef.current = null;
  }

  const allImages = messages.flatMap((m) => m.attachments);
  let lastDay = "";

  return (
    <div className="flex flex-col gap-0.5">
      {messages.map((m, i) => {
        const date = new Date(m.createdAt);

        // System note (vanish on/off): centered divider, doubles as separator + history.
        if (m.system) {
          return (
            <div key={m.id} className="my-3 flex items-center gap-3">
              <div className={cn("h-px flex-1", vanish ? "bg-white/15" : "bg-border")} />
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                  vanish ? "bg-white/10 text-white/75" : "bg-surface text-muted"
                )}
              >
                <Ghost size={12} /> {m.sender.name} {m.content}
              </span>
              <div className={cn("h-px flex-1", vanish ? "bg-white/15" : "bg-border")} />
            </div>
          );
        }

        const prev = messages[i - 1];
        const mine = m.senderId === meId;
        const showDay = dayLabel(date) !== lastDay;
        if (showDay) lastDay = dayLabel(date);

        const grouped =
          !showDay &&
          prev &&
          prev.senderId === m.senderId &&
          differenceInMinutes(date, new Date(prev.createdAt)) < 5;

        const reactionEntries = Object.entries(m.reactions || {}).filter(
          ([, ids]) => ids.length > 0
        );
        const editing = editingId === m.id;
        const isPinned = pinnedId === m.id;
        const imageOnly =
          !m.content && !m.replyTo && !isPinned && m.attachments.length > 0;

        return (
          <div key={m.id} id={`msg-${m.id}`} className={cn(flashId === m.id && "msg-flash")}>
            {showDay && (
              <div className="my-3 flex items-center gap-3">
                <div className={cn("h-px flex-1", vanish ? "bg-white/15" : "bg-border")} />
                <span className={cn("text-[11px] font-medium", vanish ? "text-white/60" : "text-faint")}>
                  {dayLabel(date)}
                </span>
                <div className={cn("h-px flex-1", vanish ? "bg-white/15" : "bg-border")} />
              </div>
            )}

            <div
              className={cn(
                "flex gap-2.5",
                mine ? "flex-row-reverse" : "flex-row",
                grouped ? "mt-0.5" : "mt-2"
              )}
            >
              {!mine &&
                (grouped ? (
                  <div className="w-7 shrink-0" />
                ) : (
                  <button
                    onClick={() => onOpenProfile?.(m.senderId)}
                    className="mt-5 shrink-0 self-start rounded-full"
                  >
                    <Avatar name={m.sender.name} src={m.sender.avatar} size="sm" />
                  </button>
                ))}

              <div className={cn("flex min-w-0 max-w-[78%] flex-col", mine && "items-end")}>
                {!grouped && (
                  <div className={cn("mb-0.5 flex items-baseline gap-2", mine && "flex-row-reverse")}>
                    {!mine && isGroup && (
                      <span className={cn("text-[12px] font-semibold", vanish && "text-white/85")}>
                        {m.sender.name}
                      </span>
                    )}
                    <span className={cn("text-[10px]", vanish ? "text-white/40" : "text-faint")}>
                      {format(date, "h:mm a")}
                    </span>
                  </div>
                )}

                <div
                  className="group relative w-fit touch-pan-y"
                  onTouchStart={(e) => touchStart(m, e)}
                  onTouchMove={(e) => touchMove(m, e)}
                  onTouchEnd={() => touchEnd(m)}
                  style={{
                    transform: swipe?.id === m.id ? `translateX(${swipe.dx}px)` : undefined,
                    transition: swipe?.id === m.id ? "none" : "transform 0.15s ease-out",
                  }}
                >
                  {/* Swipe-to-reply hint */}
                  {swipe?.id === m.id && swipe.dx < -10 && (
                    <span
                      className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 translate-x-9 items-center justify-center rounded-full bg-accent-soft text-accent"
                      style={{ opacity: Math.min(1, -swipe.dx / 55) }}
                    >
                      <Reply size={14} />
                    </span>
                  )}
                  {editing ? (
                    <div className="min-w-[220px] rounded-md border border-accent bg-elevated p-2">
                      <textarea
                        value={editText}
                        autoFocus
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        className="w-full resize-none bg-transparent text-[13px] outline-none"
                      />
                      <div className="mt-1 flex justify-end gap-1">
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface"
                        >
                          <X size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (editText.trim()) onEdit(m.id, editText.trim());
                            setEditingId(null);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded bg-accent text-white"
                        >
                          <Check size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-fit max-w-full overflow-hidden rounded-lg text-[13px] leading-relaxed",
                        !imageOnly && "px-3 py-1.5",
                        !imageOnly && (mine ? "bg-msg-mine text-msg-mine-fg" : "bg-surface text-text")
                      )}
                    >
                      {isPinned && (
                        <div className="mb-0.5 flex items-center gap-1 text-[10px] font-medium opacity-70">
                          <Pin size={10} /> Pinned
                        </div>
                      )}
                      {m.replyTo && (
                        <button
                          type="button"
                          onClick={() => m.replyTo && scrollToMessage(m.replyTo.id)}
                          className="mb-1 block w-full rounded border-l-2 border-accent/70 pl-2 text-left opacity-80 transition-opacity hover:opacity-100"
                        >
                          <p className="text-[11px] font-semibold">{m.replyTo.senderName}</p>
                          <p className="truncate text-[12px]">{m.replyTo.content}</p>
                        </button>
                      )}
                      {m.content && (
                        <div
                          className="chat-md whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                        />
                      )}
                      <div className={cn("flex flex-col gap-1", m.content && "mt-1.5")}>
                        {m.attachments.map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={url}
                            src={url}
                            alt="attachment"
                            onClick={() => setLightbox(allImages.indexOf(url))}
                            className={cn(
                              "block max-h-72 max-w-full cursor-pointer rounded-lg object-cover",
                              !imageOnly && "border border-black/10"
                            )}
                          />
                        ))}
                      </div>
                      {m.editedAt && (
                        <span className={cn("ml-1.5 text-[10px]", mine ? "opacity-60" : "text-faint")}>
                          (edited)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Floating action bar — sits above the bubble; the pb bridge
                      keeps it hoverable without overlapping the message. */}
                  {!editing && (
                    <div
                      className={cn(
                        "absolute bottom-full z-20 pb-1.5 transition-opacity",
                        // Anchor to the message's own side so the bar extends into
                        // free space and never runs off the screen edge on mobile.
                        mine ? "right-0" : "left-0",
                        openMenuId === m.id
                          ? "opacity-100"
                          : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                      )}
                    >
                      <div className="flex flex-nowrap items-center gap-0.5 whitespace-nowrap rounded-md border border-border bg-overlay p-0.5 shadow-md">
                      {QUICK_REACTIONS.slice(0, 4).map((e) => (
                        <button
                          key={e}
                          onClick={() => onReact(m.id, e)}
                          className="flex h-6 w-6 items-center justify-center rounded text-[15px] hover:bg-surface"
                        >
                          {e}
                        </button>
                      ))}
                      <EmojiPopover onPick={(e) => onReact(m.id, e)} align="right">
                        <span className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface hover:text-text">
                          <SmilePlus size={14} />
                        </span>
                      </EmojiPopover>
                      <div className="mx-0.5 h-4 w-px bg-border" />
                      <button
                        onClick={() => onReply(m)}
                        title="Reply"
                        className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface hover:text-text"
                      >
                        <Reply size={13} />
                      </button>
                      <button
                        onClick={() => onPin(m.id)}
                        title={isPinned ? "Unpin" : "Pin"}
                        className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface hover:text-text"
                      >
                        {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                      </button>
                      {mine && (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(m.id);
                              setEditText(m.content);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface hover:text-text"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => onDelete(m.id)}
                            className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface hover:text-danger"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                      </div>
                    </div>
                  )}
                </div>

                {reactionEntries.length > 0 && (
                  <div
                    className={cn(
                      "relative z-10 -mt-1.5 flex flex-wrap gap-1",
                      mine ? "justify-end pr-1.5" : "justify-start pl-1.5"
                    )}
                  >
                    {reactionEntries.map(([emoji, ids]) => (
                      <button
                        key={emoji}
                        onClick={() => onReact(m.id, emoji)}
                        className={cn(
                          "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] shadow-sm transition-colors",
                          ids.includes(meId)
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border bg-elevated text-muted hover:bg-surface"
                        )}
                      >
                        <span className="text-[12px] leading-none">{emoji}</span>
                        <span className="font-medium">{ids.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {lightbox !== null && (
        <Lightbox
          images={allImages}
          index={lightbox}
          onIndex={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
