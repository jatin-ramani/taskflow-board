"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  MessageSquare,
  BadgeCheck,
  UserPlus,
  CalendarDays,
  Users,
  FolderKanban,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CopyButton } from "@/components/ui/copy-button";
import { useToast } from "@/components/ui/toast";
import { cn, timeAgo } from "@/lib/utils";
import type { UserProfile } from "@/types";

export function UserProfileDialog({
  userId,
  onClose,
  onMessage,
}: {
  userId: string | null;
  onClose: () => void;
  onMessage?: (userId: string) => void;
}) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setProfile(null);
    setRequested(false);
    fetch(`/api/users/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [userId]);

  async function addFriend() {
    if (!profile) return;
    setRequesting(true);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id }),
    });
    setRequesting(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setRequested(true);
      toast(d.status === "accepted" ? "You're now friends" : "Friend request sent", "success");
    } else {
      toast(d.error || "Could not send request", "error");
    }
  }

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm p-0"
        title="Profile"
        closeClassName="text-white/90 hover:bg-white/25 hover:text-white"
      >
        {loading || !profile ? (
          <div className="flex h-56 items-center justify-center">
            <Spinner size={20} />
          </div>
        ) : (
          <div>
            {/* Cover */}
            <div className="h-20 bg-linear-to-r from-accent via-accent to-[#7174d4]" />

            <div className="px-5 pb-5">
              {/* Avatar */}
              <div className="-mt-11 flex w-fit rounded-full bg-elevated p-1">
                <Avatar
                  name={profile.name}
                  src={profile.avatar}
                  size="xl"
                  online={profile.online}
                />
              </div>

              {/* Identity */}
              <div className="mt-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">{profile.name}</h2>
                  {profile.isFriend && !profile.isSelf && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                      <BadgeCheck size={12} /> Friend
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] text-muted">
                  {profile.username ? (
                    `@${profile.username}`
                  ) : (
                    <span className="font-mono tracking-wider">{profile.publicId}</span>
                  )}
                </p>
                <p
                  className={cn(
                    "mt-1.5 flex items-center gap-1.5 text-[12px]",
                    profile.online ? "text-success" : "text-faint"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      profile.online ? "bg-success" : "bg-faint"
                    )}
                  />
                  {profile.online
                    ? "Active now"
                    : profile.lastSeenAt
                      ? `Last seen ${timeAgo(profile.lastSeenAt)}`
                      : "Offline"}
                </p>
              </div>

              {profile.bio && (
                <p className="mt-3 text-[13px] leading-relaxed text-muted">{profile.bio}</p>
              )}

              {/* Facts */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Tile
                  icon={<CalendarDays size={14} />}
                  label="Joined"
                  value={format(new Date(profile.createdAt), "MMM yyyy")}
                />
                {!profile.isSelf && (
                  <Tile
                    icon={<Users size={14} />}
                    label="Mutual friends"
                    value={String(profile.mutualFriends)}
                  />
                )}
                <Tile
                  icon={<FolderKanban size={14} />}
                  label="Shared projects"
                  value={String(profile.sharedProjects.length)}
                />
                {profile.friendSince && (
                  <Tile
                    icon={<BadgeCheck size={14} />}
                    label="Friends since"
                    value={format(new Date(profile.friendSince), "MMM yyyy")}
                  />
                )}
              </div>

              {/* Shared projects */}
              {profile.sharedProjects.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
                    Shared projects
                  </p>
                  <div className="flex flex-col gap-1">
                    {profile.sharedProjects.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded-md bg-surface/60 px-2.5 py-1.5"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: p.color }}
                        />
                        <span className="truncate text-[13px]">{p.name}</span>
                      </div>
                    ))}
                    {profile.sharedProjects.length > 4 && (
                      <p className="px-1 text-[11px] text-faint">
                        +{profile.sharedProjects.length - 4} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Friend code */}
              <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-faint">Friend code</p>
                  <p className="font-mono text-[14px] font-semibold tracking-[0.15em]">
                    {profile.publicId}
                  </p>
                </div>
                <CopyButton value={profile.publicId} size={15} />
              </div>

              {/* Action */}
              {profile.isSelf ? null : profile.isFriend ? (
                onMessage && (
                  <Button className="mt-4 w-full" onClick={() => onMessage(profile.id)}>
                    <MessageSquare size={15} /> Message
                  </Button>
                )
              ) : (
                <Button
                  className="mt-4 w-full"
                  onClick={addFriend}
                  disabled={requesting || requested}
                >
                  {requesting ? (
                    <Spinner size={14} className="text-white" />
                  ) : requested ? (
                    "Request sent"
                  ) : (
                    <>
                      <UserPlus size={15} /> Add friend
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface/40 px-3 py-2">
      <span className="text-muted">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-faint">{label}</p>
        <p className="truncate text-[13px] font-semibold">{value}</p>
      </div>
    </div>
  );
}
