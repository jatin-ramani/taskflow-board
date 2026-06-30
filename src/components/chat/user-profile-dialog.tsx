"use client";

import { useEffect, useState } from "react";
import { MessageSquare, AtSign, BadgeCheck } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setProfile(null);
    fetch(`/api/users/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        {loading || !profile ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={20} />
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-7 text-center">
            <Avatar name={profile.name} src={profile.avatar} size="xl" online={profile.online} />
            <h2 className="mt-3 text-lg font-semibold">{profile.name}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
              {profile.username ? (
                <>
                  <AtSign size={13} />
                  {profile.username}
                </>
              ) : (
                <span className="font-mono tracking-wider">{profile.publicId}</span>
              )}
            </p>
            <p className="mt-2 text-[12px]">
              <span
                className={
                  profile.online
                    ? "font-medium text-success"
                    : "text-faint"
                }
              >
                {profile.online ? "● Active now" : "● Offline"}
              </span>
            </p>

            {profile.bio && (
              <p className="mt-3 text-[13px] leading-relaxed text-muted">{profile.bio}</p>
            )}

            {profile.isFriend && (
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
                <BadgeCheck size={13} /> Friend
              </span>
            )}

            {profile.isFriend && onMessage && (
              <Button className="mt-5 w-full" onClick={() => onMessage(profile.id)}>
                <MessageSquare size={15} /> Message
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
