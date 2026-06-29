"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Inbox as InboxIcon,
  UserPlus,
  UserCheck,
  Check,
  X,
  CheckCheck,
  FolderPlus,
  CheckSquare,
  MessageSquare,
  AtSign,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationItem } from "@/types";

const typeMeta: Record<string, { icon: React.ReactNode; color: string }> = {
  FRIEND_REQUEST: { icon: <UserPlus size={14} />, color: "#7c5cff" },
  FRIEND_ACCEPTED: { icon: <UserCheck size={14} />, color: "#4cb782" },
  PROJECT_INVITE: { icon: <FolderPlus size={14} />, color: "#7c5cff" },
  TASK_ASSIGNED: { icon: <CheckSquare size={14} />, color: "#56a8f5" },
  TASK_COMMENT: { icon: <MessageSquare size={14} />, color: "#a1a5ad" },
  TASK_MENTION: { icon: <AtSign size={14} />, color: "#f2994a" },
  TASK_DUE: { icon: <Clock size={14} />, color: "#eb5757" },
  NEW_MESSAGE: { icon: <MessageSquare size={14} />, color: "#7c5cff" },
};

export default function InboxPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) setItems((await res.json()).items);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      await fetch("/api/notifications/read", { method: "POST" });
      refreshSidebar();
    })();
  }, [load]);

  async function markAllRead() {
    await fetch("/api/notifications/read", { method: "POST" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    refreshSidebar();
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
        toast(action === "accept" ? "You're now friends" : "Request declined", "success");
      } else {
        const d = await res.json();
        toast(d.error || "Already handled", "error");
      }
      await load();
      refreshSidebar();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Inbox"
        icon={<InboxIcon size={16} />}
        actions={
          items.some((n) => !n.isRead) ? (
            <Button size="sm" variant="ghost" onClick={markAllRead}>
              <CheckCheck size={14} /> Mark all read
            </Button>
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-6">
          {loading ? (
            <div className="py-16">
              <Spinner size={20} className="mx-auto" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<InboxIcon size={20} />}
              title="You're all caught up"
              description="Friend requests, mentions, and updates will show up here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-elevated">
              {items.map((n) => {
                const meta = typeMeta[n.type] ?? {
                  icon: <InboxIcon size={14} />,
                  color: "#a1a5ad",
                };
                const isFriendReq = n.type === "FRIEND_REQUEST" && n.entityId;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 border-b border-border/60 px-4 py-3.5 transition-colors last:border-b-0",
                      !n.isRead && "bg-surface/40"
                    )}
                  >
                    <div className="relative">
                      {n.actor ? (
                        <>
                          <Avatar name={n.actor.name} src={n.actor.avatar} size="md" />
                          <span
                            className="absolute -bottom-0.5 -right-0.5 flex h-[15px] w-[15px] items-center justify-center rounded-full ring-2 ring-elevated"
                            style={{ background: meta.color, color: "#fff" }}
                          >
                            <span className="scale-[0.62]">{meta.icon}</span>
                          </span>
                        </>
                      ) : (
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full"
                          style={{ background: `${meta.color}22`, color: meta.color }}
                        >
                          {meta.icon}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[13px] font-medium">
                        {n.title}
                        {!n.isRead && (
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        )}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-[13px] text-muted">{n.body}</p>
                      )}
                      <p className="mt-1 text-[11px] text-faint">{timeAgo(n.createdAt)}</p>

                      {isFriendReq && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => respond(n.entityId!, "accept")}
                            disabled={busyId === n.entityId}
                          >
                            <Check size={13} /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => respond(n.entityId!, "decline")}
                            disabled={busyId === n.entityId}
                          >
                            <X size={13} /> Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
