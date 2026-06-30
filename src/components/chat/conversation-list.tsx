"use client";

import { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  BellOff,
  Bell,
  Star,
  Trash2,
  LogOut,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import type { ConversationDTO } from "@/types";

function ConvoAvatar({ convo }: { convo: ConversationDTO }) {
  if (convo.isGroup) {
    if (convo.image) {
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <img
          src={convo.image}
          alt={convo.title}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      );
    }
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Users size={17} />
      </span>
    );
  }
  const u = convo.avatarUsers[0];
  return (
    <Avatar name={u?.name ?? convo.title} src={u?.avatar} size="lg" online={convo.online} />
  );
}

export function ConversationList({
  convos,
  selectedId,
  onSelect,
  onChanged,
}: {
  convos: ConversationDTO[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuId) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuId]);

  async function setting(id: string, body: Record<string, unknown>) {
    await fetch(`/api/conversations/${id}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onChanged();
  }

  async function leave(id: string) {
    if (!confirm("Leave this group?")) return;
    const res = await fetch(`/api/conversations/${id}/leave`, { method: "POST" });
    if (res.ok) {
      toast("You left the group", "success");
      if (selectedId === id) onSelect(null);
      onChanged();
    }
  }

  async function del(id: string) {
    await setting(id, { clear: true });
    if (selectedId === id) onSelect(null);
    toast("Chat deleted", "success");
  }

  const favorites = convos.filter((c) => c.favorite);
  const groups = convos.filter((c) => !c.favorite && c.isGroup);
  const directs = convos.filter((c) => !c.favorite && !c.isGroup);

  const sections: { key: string; label: string; items: ConversationDTO[] }[] = [
    { key: "fav", label: "Favorites", items: favorites },
    { key: "grp", label: "Groups", items: groups },
    { key: "dm", label: "Direct messages", items: directs },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-1.5">
      {convos.length === 0 && (
        <p className="px-3 py-10 text-center text-[13px] text-faint">
          No conversations yet. Tap + to start one.
        </p>
      )}

      {sections.map(
        (sec) =>
          sec.items.length > 0 && (
            <div key={sec.key} className="mb-1">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [sec.key]: !c[sec.key] }))}
                className="flex w-full items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-faint"
              >
                {collapsed[sec.key] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                {sec.label}
                <span className="text-faint/70">{sec.items.length}</span>
              </button>

              {!collapsed[sec.key] &&
                sec.items.map((c) => (
                  <div key={c.id} className="group/item relative">
                    <button
                      onClick={() => onSelect(c.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                        selectedId === c.id ? "bg-surface" : "hover:bg-surface"
                      )}
                    >
                      <ConvoAvatar convo={c} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1 truncate text-[13px] font-medium">
                            <span className="truncate">{c.title}</span>
                            {c.muted && <BellOff size={12} className="shrink-0 text-faint" />}
                          </span>
                          <span className="shrink-0 text-[10px] text-faint">
                            {c.lastMessage ? timeAgo(c.lastMessage.createdAt) : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-[12px]",
                              c.unreadCount > 0 ? "font-medium text-text" : "text-faint"
                            )}
                          >
                            {c.lastMessage
                              ? `${
                                  c.lastMessage.senderName
                                    ? c.lastMessage.senderName + ": "
                                    : c.lastMessage.isMine
                                      ? "You: "
                                      : ""
                                }${c.lastMessage.content}`
                              : "No messages yet"}
                          </span>
                          {c.unreadCount > 0 && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* ⋯ menu */}
                    <button
                      onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                      className={cn(
                        "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded bg-elevated text-faint opacity-0 transition-opacity hover:text-text group-hover/item:opacity-100",
                        menuId === c.id && "opacity-100"
                      )}
                    >
                      <MoreHorizontal size={15} />
                    </button>

                    {menuId === c.id && (
                      <div
                        ref={menuRef}
                        className="animate-slide-up absolute right-2 top-8 z-30 w-44 overflow-hidden rounded-md border border-border bg-overlay p-1 shadow-popover"
                      >
                        <MenuItem
                          icon={c.muted ? <Bell size={14} /> : <BellOff size={14} />}
                          label={c.muted ? "Unmute" : "Mute"}
                          onClick={() => {
                            setting(c.id, { muted: !c.muted });
                            setMenuId(null);
                          }}
                        />
                        <MenuItem
                          icon={
                            <Star size={14} className={c.favorite ? "fill-warning text-warning" : ""} />
                          }
                          label={c.favorite ? "Remove favorite" : "Add to favorites"}
                          onClick={() => {
                            setting(c.id, { favorite: !c.favorite });
                            setMenuId(null);
                          }}
                        />
                        <div className="my-1 h-px bg-border" />
                        {c.isGroup ? (
                          <MenuItem
                            icon={<LogOut size={14} />}
                            label="Leave group"
                            danger
                            onClick={() => {
                              leave(c.id);
                              setMenuId(null);
                            }}
                          />
                        ) : (
                          <MenuItem
                            icon={<Trash2 size={14} />}
                            label="Delete chat"
                            danger
                            onClick={() => {
                              del(c.id);
                              setMenuId(null);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-[13px] text-muted transition-colors hover:bg-surface",
        danger ? "hover:text-danger" : "hover:text-text"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
