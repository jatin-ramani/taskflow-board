"use client";

import { useState } from "react";
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

  const allImages = messages.flatMap((m) => m.attachments);
  let lastDay = "";

  return (
    <div className="flex flex-col gap-0.5">
      {messages.map((m, i) => {
        const date = new Date(m.createdAt);
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

        return (
          <div key={m.id}>
            {showDay && (
              <div className="my-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-medium text-faint">{dayLabel(date)}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            <div
              className={cn(
                "group flex gap-2.5",
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
                    className="shrink-0 self-end rounded-full"
                  >
                    <Avatar name={m.sender.name} src={m.sender.avatar} size="sm" />
                  </button>
                ))}

              <div className={cn("flex min-w-0 max-w-[78%] flex-col", mine && "items-end")}>
                {!grouped && (
                  <div className={cn("mb-0.5 flex items-baseline gap-2", mine && "flex-row-reverse")}>
                    {!mine && isGroup && (
                      <span className="text-[12px] font-semibold">{m.sender.name}</span>
                    )}
                    <span className="text-[10px] text-faint">{format(date, "h:mm a")}</span>
                  </div>
                )}

                <div className="relative w-fit">
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
                        "rounded-md px-3 py-1.5 text-[13px] leading-relaxed",
                        mine ? "bg-msg-mine text-msg-mine-fg" : "bg-surface text-text"
                      )}
                    >
                      {isPinned && (
                        <div className="mb-0.5 flex items-center gap-1 text-[10px] font-medium opacity-70">
                          <Pin size={10} /> Pinned
                        </div>
                      )}
                      {m.replyTo && (
                        <div className="mb-1 border-l-2 border-accent/70 pl-2 opacity-80">
                          <p className="text-[11px] font-semibold">{m.replyTo.senderName}</p>
                          <p className="truncate text-[12px]">{m.replyTo.content}</p>
                        </div>
                      )}
                      {m.content && (
                        <div
                          className="chat-md whitespace-pre-wrap break-words"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                        />
                      )}
                      {m.attachments.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt="attachment"
                          onClick={() => setLightbox(allImages.indexOf(url))}
                          className="mt-1 max-h-60 cursor-pointer rounded border border-black/10"
                        />
                      ))}
                      {m.editedAt && (
                        <span className={cn("ml-1.5 text-[10px]", mine ? "opacity-60" : "text-faint")}>
                          (edited)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Floating action bar */}
                  {!editing && (
                    <div className="absolute -top-3.5 right-0 z-20 flex items-center gap-0.5 rounded-md border border-border bg-overlay p-0.5 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
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
                  )}
                </div>

                {reactionEntries.length > 0 && (
                  <div className={cn("mt-1 flex flex-wrap gap-1", mine && "justify-end")}>
                    {reactionEntries.map(([emoji, ids]) => (
                      <button
                        key={emoji}
                        onClick={() => onReact(m.id, emoji)}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                          ids.includes(meId)
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border bg-elevated text-muted hover:bg-surface"
                        )}
                      >
                        <span>{emoji}</span>
                        <span>{ids.length}</span>
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
