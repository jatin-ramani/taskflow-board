"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, UserPlus, Check, X, Clock, MessageSquare, Circle } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import { onRealtime } from "@/components/layout/realtime";
import type { FriendItem, FriendRequestItem, PublicUser } from "@/types";

type SearchStatus = "none" | "friends" | "incoming" | "outgoing" | "blocked";
interface SearchResult {
  user: PublicUser;
  status: SearchStatus;
  friendshipId: string | null;
}

function handleOf(u: PublicUser) {
  return u.username ? `@${u.username}` : u.publicId;
}

export default function FriendsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

  const loadAll = useCallback(async () => {
    const [fRes, rRes] = await Promise.all([
      fetch("/api/friends"),
      fetch("/api/friends/requests"),
    ]);
    if (fRes.ok) setFriends(await fRes.json());
    if (rRes.ok) {
      const data = await rRes.json();
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Live updates: presence dots instantly, and refetch on any notification
  // (e.g. an incoming request or someone accepting yours) so the lists update
  // without a manual refresh.
  useEffect(() => {
    return onRealtime((p) => {
      if (p.type === "presence" && p.userId) {
        setFriends((prev) =>
          prev.map((f) => (f.user.id === p.userId ? { ...f, online: !!p.online } : f))
        );
      } else if (p.type === "notification") {
        loadAll();
      }
    });
  }, [loadAll]);

  // Fallback poll + refresh on focus (covers serverless where SSE can't reach).
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) loadAll();
    };
    const t = setInterval(tick, 10000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", tick);
    };
  }, [loadAll]);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  async function refreshEverything() {
    await loadAll();
    if (query) await runSearch(query);
    refreshSidebar();
  }

  async function sendRequest(userId: string) {
    setBusyId(userId);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) toast(data.error || "Could not send request", "error");
      else {
        toast(
          data.status === "accepted" ? "You're now friends" : "Friend request sent",
          "success"
        );
        await refreshEverything();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function respond(friendshipId: string, action: "accept" | "decline") {
    setBusyId(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast(action === "accept" ? "Friend request accepted" : "Request declined", "success");
        await refreshEverything();
      } else {
        const d = await res.json();
        toast(d.error || "Something went wrong", "error");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function message(userId: string) {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/messages?c=${id}`);
    } else {
      toast("Could not open chat", "error");
    }
  }

  async function remove(friendshipId: string, label: string) {
    setBusyId(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      if (res.ok) {
        toast(label, "success");
        await refreshEverything();
      }
    } finally {
      setBusyId(null);
    }
  }

  const onlineCount = friends.filter((f) => f.online).length;

  return (
    <>
      <PageHeader
        title="Friends"
        icon={<Users size={16} />}
        actions={
          <span className="text-[12px] text-faint">
            {friends.length} friend{friends.length === 1 ? "" : "s"}
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 sm:px-6">
          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Friends" value={friends.length} icon={<Users size={15} />} color="#4f9dff" />
            <Stat label="Online now" value={onlineCount} icon={<Circle size={15} />} color="#22c55e" />
            <Stat label="Requests" value={incoming.length} icon={<UserPlus size={15} />} color="#f5a623" />
            <Stat label="Sent" value={outgoing.length} icon={<Clock size={15} />} color="#a855f7" />
          </div>

          {/* Add friend */}
          <section className="rounded-xl border border-border bg-elevated p-4">
            <h2 className="text-[13px] font-semibold">Add a friend</h2>
            <p className="mt-0.5 text-[12px] text-faint">
              Search by friend code, @username, or name.
            </p>
            <div className="relative mt-3">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. K7M2QX or jane"
                className="bg-surface pl-9"
              />
              {searching && (
                <Spinner size={14} className="absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {results && (
              <div className="mt-2 flex flex-col gap-0.5">
                {results.length === 0 && (
                  <p className="py-3 text-center text-[13px] text-faint">
                    No one found for “{query}”
                  </p>
                )}
                {results.map((r) => (
                  <Row key={r.user.id} user={r.user}>
                    {r.status === "none" && (
                      <Button
                        size="sm"
                        onClick={() => sendRequest(r.user.id)}
                        disabled={busyId === r.user.id}
                      >
                        {busyId === r.user.id ? (
                          <Spinner size={13} className="text-white" />
                        ) : (
                          <>
                            <UserPlus size={13} /> Add
                          </>
                        )}
                      </Button>
                    )}
                    {r.status === "outgoing" && (
                      <span className="flex items-center gap-1.5 text-[12px] text-faint">
                        <Clock size={13} /> Requested
                      </span>
                    )}
                    {r.status === "incoming" && r.friendshipId && (
                      <Button
                        size="sm"
                        onClick={() => respond(r.friendshipId!, "accept")}
                        disabled={busyId === r.friendshipId}
                      >
                        <Check size={13} /> Accept
                      </Button>
                    )}
                    {r.status === "friends" && (
                      <span className="text-[12px] font-medium text-success">Friends</span>
                    )}
                  </Row>
                ))}
              </div>
            )}
          </section>

          {loading ? (
            <div className="py-16">
              <Spinner size={20} className="mx-auto" />
            </div>
          ) : (
            <>
              {incoming.length > 0 && (
                <Card title="Friend requests" count={incoming.length}>
                  {incoming.map((r) => (
                    <Row key={r.friendshipId} user={r.user}>
                      <Button
                        size="sm"
                        onClick={() => respond(r.friendshipId, "accept")}
                        disabled={busyId === r.friendshipId}
                      >
                        <Check size={13} /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => respond(r.friendshipId, "decline")}
                        disabled={busyId === r.friendshipId}
                      >
                        <X size={13} />
                      </Button>
                    </Row>
                  ))}
                </Card>
              )}

              {outgoing.length > 0 && (
                <Card title="Sent" count={outgoing.length}>
                  {outgoing.map((r) => (
                    <Row key={r.friendshipId} user={r.user}>
                      <span className="flex items-center gap-1.5 text-[12px] text-faint">
                        <Clock size={13} /> Pending
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(r.friendshipId, "Request canceled")}
                        disabled={busyId === r.friendshipId}
                      >
                        Cancel
                      </Button>
                    </Row>
                  ))}
                </Card>
              )}

              <section className="mt-5">
                <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
                  All friends <span className="text-faint">{friends.length}</span>
                </h2>
                {friends.length === 0 ? (
                  <EmptyState
                    icon={<Users size={20} />}
                    title="No friends yet"
                    description="Search above to add your first friend by their code."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {friends.map((f) => (
                      <FriendCard
                        key={f.friendshipId}
                        friend={f}
                        busy={busyId === f.friendshipId}
                        onMessage={() => message(f.user.id)}
                        onRemove={() => setConfirmRemove({ id: f.friendshipId, name: f.user.name })}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
        title="Remove friend?"
        description={
          confirmRemove
            ? `${confirmRemove.name} will be removed from your friends. You can add them again later.`
            : undefined
        }
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (confirmRemove) remove(confirmRemove.id, "Removed friend");
        }}
      />
    </>
  );
}

function Stat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-elevated p-3 shadow-sm"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}1a`, color }}>
        {icon}
      </span>
      <div>
        <p className="text-[18px] font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted">{label}</p>
      </div>
    </div>
  );
}

function FriendCard({
  friend,
  busy,
  onMessage,
  onRemove,
}: {
  friend: FriendItem;
  busy: boolean;
  onMessage: () => void;
  onRemove: () => void;
}) {
  const u = friend.user;
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-elevated p-4 text-center shadow-sm transition-shadow hover:shadow-md">
      <Avatar name={u.name} src={u.avatar} size="xl" online={friend.online} />
      <p className="mt-2 w-full truncate text-[13px] font-semibold">{u.name}</p>
      <p className="w-full truncate text-[11px] text-faint">
        {u.username ? `@${u.username}` : u.publicId}
      </p>
      <div className="mt-3 flex w-full gap-2">
        <Button size="sm" className="flex-1" onClick={onMessage}>
          <MessageSquare size={13} /> Message
        </Button>
        <Button size="sm" variant="secondary" onClick={onRemove} disabled={busy} aria-label="Remove">
          <X size={13} />
        </Button>
      </div>
    </div>
  );
}

function Card({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-border bg-elevated">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {count !== undefined && <span className="text-[12px] text-faint">{count}</span>}
      </div>
      <div className="p-1.5">{children}</div>
    </section>
  );
}

function Row({
  user,
  online,
  children,
}: {
  user: PublicUser;
  online?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface">
      <Avatar name={user.name} src={user.avatar} size="md" online={online} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{user.name}</p>
        <p className="truncate text-[12px] text-faint">
          {user.username ? `@${user.username}` : user.publicId}
        </p>
      </div>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}
