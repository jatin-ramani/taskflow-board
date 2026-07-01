"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Plus, ArrowLeft, Users, Pin, Ghost, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/common/empty-state";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import { onRealtime } from "@/components/layout/realtime";
import { MobileMenuButton } from "@/components/layout/app-shell";
import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import { NewGroupDialog } from "@/components/chat/new-group-dialog";
import { GroupPeople } from "@/components/chat/group-people";
import { ConversationList } from "@/components/chat/conversation-list";
import { UserProfileDialog } from "@/components/chat/user-profile-dialog";
import { ThreadMenu } from "@/components/chat/thread-menu";
import type { ConversationDTO, ConversationMeta, MessageDTO, FriendItem } from "@/types";

export default function MessagesPage() {
  const { data: session } = useSession();
  const meId = session?.user?.id;

  const [convos, setConvos] = useState<ConversationDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [chatSearch, setChatSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadConvos = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) setConvos(await res.json());
    setLoadingList(false);
  }, []);

  const onThreadActivity = useCallback(() => {
    loadConvos();
    refreshSidebar();
  }, [loadConvos]);

  useEffect(() => {
    loadConvos();
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) setSelectedId(c);
  }, [loadConvos]);

  useEffect(() => {
    const off = onRealtime((p) => {
      if (p.type === "message" || p.type === "presence") loadConvos();
    });
    const t = setInterval(loadConvos, 20000);
    return () => {
      off();
      clearInterval(t);
    };
  }, [loadConvos]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  async function openMenu() {
    setMenuOpen((o) => !o);
    if (friends.length === 0) {
      const r = await fetch("/api/friends");
      if (r.ok) setFriends(await r.json());
    }
  }

  const startChat = useCallback(
    async (userId: string) => {
      setMenuOpen(false);
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const { id } = await res.json();
        await loadConvos();
        setSelectedId(id);
      }
    },
    [loadConvos]
  );

  return (
    <div className="flex h-full min-h-0">
      {/* Conversation list */}
      <div
        className={cn(
          "flex w-full flex-col border-r border-border sm:w-[320px] sm:shrink-0",
          selectedId && "hidden sm:flex"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3 sm:px-4">
          <h1 className="flex items-center gap-2 text-sm font-semibold">
            <MobileMenuButton className="-ml-1" />
            <MessageSquare size={16} className="text-muted" /> Chat
          </h1>
          <div ref={menuRef} className="relative">
            <button
              onClick={openMenu}
              className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-text"
              aria-label="New chat"
            >
              <Plus size={16} />
            </button>
            {menuOpen && (
              <div className="animate-slide-up absolute right-0 top-9 z-20 w-60 overflow-hidden rounded-md border border-border bg-overlay p-1 shadow-popover">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setGroupOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium transition-colors hover:bg-surface"
                >
                  <Users size={15} className="text-accent" /> New group
                </button>
                <div className="my-1 h-px bg-border" />
                <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  Direct message
                </p>
                {friends.length === 0 ? (
                  <p className="px-2.5 py-2 text-[12px] text-faint">No friends yet</p>
                ) : (
                  friends.map((f) => (
                    <button
                      key={f.user.id}
                      onClick={() => startChat(f.user.id)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-surface"
                    >
                      <Avatar name={f.user.name} src={f.user.avatar} size="sm" online={f.online} />
                      <span className="truncate text-[13px]">{f.user.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 border-b border-border px-3 py-2 sm:px-4">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Search chats…"
              className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-accent"
            />
          </div>
        </div>

        {loadingList ? (
          <div className="py-10">
            <Spinner size={18} className="mx-auto" />
          </div>
        ) : (
          <ConversationList
            convos={convos.filter((c) =>
              c.title.toLowerCase().includes(chatSearch.trim().toLowerCase())
            )}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChanged={loadConvos}
          />
        )}
      </div>

      {/* Thread */}
      <div className={cn("min-w-0 flex-1", !selectedId && "hidden sm:block")}>
        {selectedId && meId ? (
          <Thread
            key={selectedId}
            conversationId={selectedId}
            meId={meId}
            onBack={() => setSelectedId(null)}
            onActivity={onThreadActivity}
            onOpenProfile={setProfileUserId}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<MessageSquare size={20} />}
              title="Your messages"
              description="Select a conversation or start a new one to begin chatting."
            />
          </div>
        )}
      </div>

      <NewGroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onCreated={(id) => {
          loadConvos();
          setSelectedId(id);
        }}
      />

      <UserProfileDialog
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onMessage={(uid) => {
          setProfileUserId(null);
          startChat(uid);
        }}
      />
    </div>
  );
}

function Thread({
  conversationId,
  meId,
  onBack,
  onActivity,
  onOpenProfile,
}: {
  conversationId: string;
  meId: string;
  onBack: () => void;
  onActivity: () => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<MessageDTO | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);
  const vanishRef = useRef(false);

  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }, []);

  const load = useCallback(
    async (markRead: boolean) => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setMeta(data.meta);
        if (data.messages.length !== lastCountRef.current) {
          lastCountRef.current = data.messages.length;
          scrollToBottom();
        }
      }
      if (markRead) {
        await fetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
        onActivity();
      }
      setLoading(false);
    },
    [conversationId, onActivity, scrollToBottom]
  );

  useEffect(() => {
    setLoading(true);
    lastCountRef.current = 0;
    load(true);
  }, [load]);

  useEffect(() => {
    const off = onRealtime((p) => {
      if (p.type === "message" && p.conversationId === conversationId) load(true);
    });
    const t = setInterval(() => load(true), 15000);
    return () => {
      off();
      clearInterval(t);
    };
  }, [load, conversationId]);

  // Vanish mode: when leaving this chat with vanish on, purge the ephemeral
  // messages sent during the session (old history stays). keepalive lets the
  // request finish even as the component unmounts.
  useEffect(() => {
    vanishRef.current = meta?.vanishMode ?? false;
  }, [meta?.vanishMode]);

  useEffect(() => {
    return () => {
      if (vanishRef.current) {
        fetch(`/api/conversations/${conversationId}/vanish`, {
          method: "DELETE",
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [conversationId]);

  async function send(content: string, attachments: string[]) {
    const replyToId = replyingTo?.id ?? null;
    setReplyingTo(null);
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, attachments, replyToId }),
    });
    if (res.ok) {
      const msg: MessageDTO = await res.json();
      setMessages((prev) => [...prev, msg]);
      lastCountRef.current += 1;
      scrollToBottom(true);
      onActivity();
    }
  }

  async function pin(id: string) {
    await fetch(`/api/messages/${id}/pin`, { method: "POST" });
    load(true);
  }

  async function react(id: string, emoji: string) {
    const res = await fetch(`/api/messages/${id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const { reactions } = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, reactions } : m)));
    }
  }

  async function edit(id: string, content: string) {
    const res = await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const msg: MessageDTO = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === id ? msg : m)));
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  const otherDM = meta && !meta.isGroup ? meta.members.find((m) => m.id !== meId) : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={onBack}
            className="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface hover:text-text sm:hidden"
          >
            <ArrowLeft size={16} />
          </button>
          {meta?.isGroup ? (
            meta.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meta.image} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Users size={16} />
              </span>
            )
          ) : (
            otherDM && (
              <button onClick={() => onOpenProfile(otherDM.id)} className="rounded-full">
                <Avatar name={otherDM.name} src={otherDM.avatar} size="sm" online={meta?.online} />
              </button>
            )
          )}
          <button
            onClick={() => otherDM && onOpenProfile(otherDM.id)}
            className="min-w-0 text-left"
            disabled={!otherDM}
          >
            <p className="truncate text-[13px] font-semibold">{meta?.title ?? "…"}</p>
            <p className="text-[11px] text-faint">
              {meta?.isGroup
                ? `${meta.members.length} members`
                : meta?.online
                  ? "Active now"
                  : "Offline"}
            </p>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {meta?.isGroup && (
            <GroupPeople
              conversationId={conversationId}
              members={meta.members}
              meId={meId}
              groupName={meta.title}
              groupImage={meta.image}
              onChanged={() => load(true)}
              onLeft={() => {
                onActivity();
                onBack();
              }}
              onOpenProfile={onOpenProfile}
            />
          )}
          {meta && (
            <ThreadMenu
              conversationId={conversationId}
              vanishMode={meta.vanishMode}
              onChanged={() => load(true)}
            />
          )}
        </div>
      </div>

      {/* Vanish mode banner */}
      {meta?.vanishMode ? (
        <div className="flex items-center gap-2 border-b border-border bg-accent-soft px-4 py-1.5 text-[12px] text-accent">
          <Ghost size={13} className="shrink-0" />
          <span className="min-w-0 flex-1">
            Vanish mode is on — messages you send here disappear when you close the chat.
          </span>
          <button
            onClick={async () => {
              await fetch(`/api/conversations/${conversationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vanishMode: false }),
              });
              load(true);
            }}
            className="shrink-0 rounded-full border border-accent/40 px-2.5 py-0.5 text-[11px] font-semibold transition-colors hover:bg-accent hover:text-white"
          >
            Turn off
          </button>
        </div>
      ) : null}

      {/* Pinned banner */}
      {meta?.pinned && (
        <div className="flex items-center gap-2 border-b border-border bg-surface/50 px-4 py-1.5">
          <Pin size={13} className="shrink-0 text-accent" />
          <p className="min-w-0 flex-1 truncate text-[12px]">
            <span className="font-medium">{meta.pinned.senderName}: </span>
            <span className="text-muted">{meta.pinned.content}</span>
          </p>
          <button
            onClick={() => pin(meta.pinned!.id)}
            className="shrink-0 text-[11px] text-faint transition-colors hover:text-text"
          >
            Unpin
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto px-3 py-5 transition-colors sm:px-5",
          meta?.vanishMode ? "bg-[#15131f] dark:bg-black" : "chat-canvas"
        )}
      >
        {loading ? (
          <Spinner size={18} className="mx-auto mt-8" />
        ) : messages.length === 0 ? (
          <p className={cn("mt-10 text-center text-[13px]", meta?.vanishMode ? "text-white/50" : "text-faint")}>
            Say hi 👋 — this is the start of your conversation.
          </p>
        ) : (
          <div className="mx-auto max-w-3xl">
            <MessageList
              messages={messages}
              meId={meId}
              members={meta?.members ?? []}
              isGroup={!!meta?.isGroup}
              pinnedId={meta?.pinned?.id}
              vanish={!!meta?.vanishMode}
              onReact={react}
              onEdit={edit}
              onDelete={remove}
              onReply={setReplyingTo}
              onPin={pin}
              onOpenProfile={onOpenProfile}
            />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-3 pb-3 sm:px-5">
        <div className="mx-auto max-w-3xl">
          <Composer
            onSend={send}
            replyTo={
              replyingTo
                ? { senderName: replyingTo.sender.name, content: replyingTo.content }
                : null
            }
            onCancelReply={() => setReplyingTo(null)}
          />
        </div>
      </div>
    </div>
  );
}
