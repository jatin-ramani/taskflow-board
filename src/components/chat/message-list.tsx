"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import {
  SmilePlus,
  Pencil,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
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
import type { MessageDTO, MemberPresence } from "@/types";

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d");
}

export function MessageList({
  messages,
  meId,
  members = [],
  isGroup,
  pinnedId,
  vanish = false,
  onReact,
  onEdit,
  onDelete,
  onReply,
  onPin,
  onRetry,
  onOpenProfile,
}: {
  messages: MessageDTO[];
  meId: string;
  members?: MemberPresence[];
  isGroup: boolean;
  pinnedId?: string | null;
  vanish?: boolean;
  onReact: (id: string, emoji: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: (m: MessageDTO) => void;
  onPin: (id: string) => void;
  onRetry?: (m: MessageDTO) => void;
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
    if (Math.abs(dx) > Math.abs(dy) + 4) {
      // Swipe either direction to reply.
      setSwipe({ id: m.id, dx: Math.max(-90, Math.min(90, dx)) });
    }
  }
  function touchEnd(m: MessageDTO) {
    if (lpTimer.current) clearTimeout(lpTimer.current);
    if (swipe?.id === m.id && Math.abs(swipe.dx) >= 55) onReply(m);
    setSwipe(null);
    touchRef.current = null;
  }

  const userById = new Map(members.map((u) => [u.id, u]));
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
                "relative flex touch-pan-y gap-2.5",
                mine ? "flex-row-reverse" : "flex-row",
                grouped ? "mt-0.5" : "mt-2"
              )}
              onTouchStart={(e) => touchStart(m, e)}
              onTouchMove={(e) => touchMove(m, e)}
              onTouchEnd={() => touchEnd(m)}
            >
              {/* Swipe-to-reply hint (appears from the side you swipe from) */}
              {swipe?.id === m.id && Math.abs(swipe.dx) > 10 && (
                <span
                  className={cn(
                    "absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-accent-soft text-accent",
                    swipe.dx < 0 ? "right-2" : "left-2"
                  )}
                  style={{ opacity: Math.min(1, Math.abs(swipe.dx) / 55) }}
                >
                  <Reply size={14} />
                </span>
              )}
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

              <div
                className={cn("flex min-w-0 max-w-[78%] flex-col", mine && "items-end")}
                style={{
                  transform: swipe?.id === m.id ? `translateX(${swipe.dx}px)` : undefined,
                  transition: swipe?.id === m.id ? "none" : "transform 0.15s ease-out",
                }}
              >
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

                <div className="group relative w-fit">
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
                        "w-fit max-w-full overflow-hidden text-[13px] leading-relaxed",
                        imageOnly
                          ? "rounded-[18px]"
                          : cn(
                              "rounded-[18px] px-3.5 py-2",
                              mine
                                ? "bubble-mine rounded-br-[5px]"
                                : "bubble-other rounded-bl-[5px]"
                            )
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
                          className={cn(
                            "mb-1.5 flex w-full flex-col overflow-hidden rounded-lg border-l-2 py-1 pl-2.5 pr-4 text-left transition-opacity hover:opacity-100",
                            mine
                              ? "border-white/70 bg-white/15 opacity-95"
                              : "border-accent/70 bg-black/[0.05] opacity-90 dark:bg-white/[0.06]"
                          )}
                        >
                          <p className="truncate text-[11px] font-semibold">
                            {m.replyTo.senderName}
                          </p>
                          <p className="truncate text-[12px] opacity-90">{m.replyTo.content}</p>
                        </button>
                      )}
                      {m.content && (
                        <div
                          className="chat-md whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                        />
                      )}
                      {m.attachments.length > 0 && (
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
                      )}
                      {(m.editedAt || (mine && m.status)) && (
                        <div
                          className={cn(
                            "mt-0.5 flex items-center gap-1 leading-none",
                            mine ? "justify-end" : "justify-start"
                          )}
                        >
                          {m.editedAt && (
                            <span
                              className={cn("text-[10px]", mine ? "opacity-60" : "text-faint")}
                            >
                              (edited)
                            </span>
                          )}
                          {mine && m.status === "sending" && (
                            <Clock size={12} className="text-white/55" />
                          )}
                          {mine && m.status === "sent" && (
                            <Check size={13} className="text-white/55" />
                          )}
                          {mine && m.status === "delivered" && (
                            <CheckCheck size={14} className="text-white/55" />
                          )}
                          {mine && m.status === "seen" && (
                            <CheckCheck size={14} className="text-sky-300" />
                          )}
                          {mine && m.status === "failed" && (
                            <AlertCircle size={13} className="text-red-200" />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Floating action bar — sits above the bubble; the pb bridge
                      keeps it hoverable without overlapping the message. Hidden
                      for optimistic (sending/failed) messages, which have a temp
                      id the server wouldn't recognise. */}
                  {!editing && m.status !== "sending" && m.status !== "failed" && (
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

                {mine && m.status === "failed" && (
                  <button
                    onClick={() => onRetry?.(m)}
                    className="mt-1 flex items-center gap-1 text-[11px] font-medium text-danger transition-opacity hover:opacity-80"
                  >
                    <AlertCircle size={12} /> Not sent · Tap to retry
                  </button>
                )}

                {reactionEntries.length > 0 && (
                  <div
                    className={cn(
                      "relative z-10 -mt-1.5 flex flex-wrap gap-1",
                      mine ? "justify-end pr-1.5" : "justify-start pl-1.5"
                    )}
                  >
                    {reactionEntries.slice(0, 3).map(([emoji, ids]) => (
                      <ReactionChip
                        key={emoji}
                        emoji={emoji}
                        ids={ids}
                        meId={meId}
                        userById={userById}
                        align={mine ? "right" : "left"}
                        onToggle={() => onReact(m.id, emoji)}
                      />
                    ))}
                    {reactionEntries.length > 3 && (
                      <MoreReactionsChip
                        entries={reactionEntries}
                        extra={reactionEntries.length - 3}
                        meId={meId}
                        userById={userById}
                        align={mine ? "right" : "left"}
                        onReact={(emoji) => onReact(m.id, emoji)}
                      />
                    )}
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

function useCanHover() {
  const [can, setCan] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCan(mq.matches);
    const h = () => setCan(mq.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);
  return can;
}

// Portal-positioned popover: anchors to the trigger's edge (grows up or down
// depending on space), caps height to the viewport, and never clips inside the
// scrolling chat. Hover-open with a small close delay on hover devices.
function useFloating(align: "left" | "right", width: number) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canHover = useCanHover();

  function place() {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    let left = align === "right" ? r.right - width : r.left;
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    const CAP = 240; // keep the list compact + scrollable
    const spaceAbove = r.top - 12;
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const base: React.CSSProperties = { position: "fixed", left, width, zIndex: 70 };
    // Prefer opening upward (reactions usually sit low); flip down if cramped.
    if (spaceAbove >= 140 || spaceAbove >= spaceBelow) {
      setStyle({ ...base, bottom: window.innerHeight - r.top + 6, maxHeight: Math.min(spaceAbove, CAP) });
    } else {
      setStyle({ ...base, top: r.bottom + 6, maxHeight: Math.min(spaceBelow, CAP) });
    }
  }
  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    place();
    setOpen(true);
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    // Close only when the page/chat scrolls — not when scrolling inside the popover.
    const onScroll = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const hoverProps = canHover ? { onMouseEnter: show, onMouseLeave: scheduleClose } : {};
  return { open, setOpen, style, triggerRef, popRef, canHover, hoverProps };
}

// A reaction pill. Desktop: hover shows who reacted, click removes yours.
// Mobile: tap opens the list; tap your own row to remove.
function ReactionChip({
  emoji,
  ids,
  meId,
  userById,
  align,
  onToggle,
}: {
  emoji: string;
  ids: string[];
  meId: string;
  userById: Map<string, MemberPresence>;
  align: "left" | "right";
  onToggle: () => void;
}) {
  const reactedByMe = ids.includes(meId);
  const { open, setOpen, style, triggerRef, popRef, canHover, hoverProps } =
    useFloating(align, 208);

  const reactors = ids.map((id) => ({
    id,
    name: id === meId ? "You" : userById.get(id)?.name ?? "Someone",
    avatar: userById.get(id)?.avatar ?? null,
  }));

  return (
    <>
      <button
        ref={triggerRef}
        {...hoverProps}
        onClick={() => (canHover ? onToggle() : setOpen((o) => !o))}
        className={cn(
          "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] shadow-sm transition-colors",
          reactedByMe
            ? "border-accent bg-accent-soft text-accent"
            : "border-border bg-elevated text-muted hover:bg-surface"
        )}
      >
        <span className="text-[12px] leading-none">{emoji}</span>
        <span className="font-medium">{ids.length}</span>
      </button>

      {open &&
        style &&
        createPortal(
          <div
            ref={popRef}
            {...hoverProps}
            style={style}
            className="animate-slide-up flex flex-col overflow-hidden rounded-md border border-border bg-overlay p-1 shadow-popover"
          >
            <p className="flex shrink-0 items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-faint">
              <span className="text-[13px]">{emoji}</span> {ids.length} reacted
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {reactors.map((u) => (
                <button
                  key={u.id}
                  disabled={u.id !== meId}
                  onClick={() => {
                    if (u.id === meId) {
                      onToggle();
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px]",
                    u.id === meId ? "hover:bg-surface" : "cursor-default"
                  )}
                >
                  <Avatar name={u.name} src={u.avatar} size="xs" />
                  <span className="flex-1 truncate">{u.name}</span>
                  {u.id === meId ? (
                    <span className="text-[10px] font-medium text-danger">Remove</span>
                  ) : (
                    <span className="text-[12px]">{emoji}</span>
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Collapsed "+N" pill shown when a message has many reactions. Opens a combined
// "More reactions" list of every reactor; you can remove your own.
function MoreReactionsChip({
  entries,
  extra,
  meId,
  userById,
  align,
  onReact,
}: {
  entries: [string, string[]][];
  extra: number;
  meId: string;
  userById: Map<string, MemberPresence>;
  align: "left" | "right";
  onReact: (emoji: string) => void;
}) {
  const { open, setOpen, style, triggerRef, popRef, hoverProps } = useFloating(align, 224);

  const rows = entries.flatMap(([emoji, ids]) =>
    ids.map((id) => ({
      key: `${emoji}-${id}`,
      emoji,
      id,
      name: id === meId ? "You" : userById.get(id)?.name ?? "Someone",
      avatar: userById.get(id)?.avatar ?? null,
    }))
  );

  return (
    <>
      <button
        ref={triggerRef}
        {...hoverProps}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center rounded-full border border-border bg-elevated px-1.5 py-0.5 text-[11px] font-medium text-muted shadow-sm transition-colors hover:bg-surface"
      >
        +{extra}
      </button>
      {open &&
        style &&
        createPortal(
          <div
            ref={popRef}
            {...hoverProps}
            style={style}
            className="animate-slide-up flex flex-col overflow-hidden rounded-md border border-border bg-overlay p-1 shadow-popover"
          >
            <p className="shrink-0 px-2 py-1 text-[11px] font-semibold text-faint">More reactions</p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {rows.map((u) => (
                <button
                  key={u.key}
                  disabled={u.id !== meId}
                  onClick={() => {
                    if (u.id === meId) {
                      onReact(u.emoji);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px]",
                    u.id === meId ? "hover:bg-surface" : "cursor-default"
                  )}
                >
                  <Avatar name={u.name} src={u.avatar} size="xs" />
                  <span className="flex-1 truncate">{u.name}</span>
                  <span className="text-[13px]">{u.emoji}</span>
                  {u.id === meId && <X size={13} className="text-faint" />}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
