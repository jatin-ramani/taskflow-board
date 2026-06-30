"use client";

import { useEffect, useState } from "react";
import { Check, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { FriendItem } from "@/types";

export function NewGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setSelected([]);
    fetch("/api/friends")
      .then((r) => (r.ok ? r.json() : []))
      .then(setFriends)
      .catch(() => {});
  }, [open]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function create() {
    if (!name.trim() || selected.length === 0) return;
    setBusy(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), userIds: selected }),
    });
    setBusy(false);
    if (res.ok) {
      const { id } = await res.json();
      onOpenChange(false);
      onCreated(id);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="New group" description="Pick a name and add friends." />
        <div className="p-5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            autoFocus
          />

          <p className="mb-1.5 mt-4 text-[12px] font-medium text-muted">
            Add members {selected.length > 0 && `· ${selected.length}`}
          </p>
          <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {friends.length === 0 && (
              <p className="py-3 text-center text-[12px] text-faint">
                Add friends first to create a group.
              </p>
            )}
            {friends.map((f) => {
              const on = selected.includes(f.user.id);
              return (
                <button
                  key={f.user.id}
                  onClick={() => toggle(f.user.id)}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface"
                >
                  <Avatar name={f.user.name} src={f.user.avatar} size="sm" online={f.online} />
                  <span className="flex-1 truncate text-[13px]">{f.user.name}</span>
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-[5px] border",
                      on ? "border-accent bg-accent text-white" : "border-border-strong"
                    )}
                  >
                    {on && <Check size={11} />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={create}
              disabled={!name.trim() || selected.length === 0 || busy}
            >
              <Users size={14} /> Create group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
