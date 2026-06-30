"use client";

import { useEffect, useRef, useState } from "react";
import { Users, UserPlus, LogOut, Check, Pencil, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { MemberPresence, FriendItem } from "@/types";

export function GroupPeople({
  conversationId,
  members,
  meId,
  groupName,
  groupImage,
  onChanged,
  onLeft,
  onOpenProfile,
}: {
  conversationId: string;
  members: MemberPresence[];
  meId: string;
  groupName: string;
  groupImage: string | null;
  onChanged: () => void;
  onLeft: () => void;
  onOpenProfile: (userId: string) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(groupName);
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setNameDraft(groupName), [groupName]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setRenaming(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function patchGroup(body: Record<string, unknown>) {
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onChanged();
  }

  async function saveName() {
    const n = nameDraft.trim();
    setRenaming(false);
    if (n && n !== groupName) {
      await patchGroup({ name: n });
      toast("Group renamed", "success");
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const { url } = await res.json();
      await patchGroup({ avatar: url });
      toast("Group photo updated", "success");
    } else toast("Upload failed", "error");
  }

  async function leave() {
    if (!confirm("Leave this group?")) return;
    const res = await fetch(`/api/conversations/${conversationId}/leave`, { method: "POST" });
    if (res.ok) {
      toast("You left the group", "success");
      onLeft();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px] text-muted transition-colors hover:bg-surface hover:text-text"
        aria-label="People"
      >
        <Users size={14} />
        {members.length}
      </button>

      {open && (
        <div className="animate-slide-up absolute right-0 top-[calc(100%+6px)] z-30 w-72 overflow-hidden rounded-md border border-border bg-overlay shadow-popover">
          {/* Group settings header */}
          <div className="flex items-center gap-3 border-b border-border p-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative shrink-0"
              title="Change photo"
            >
              {groupImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={groupImage} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Users size={20} />
                </span>
              )}
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-elevated text-faint">
                {uploading ? <Spinner size={11} /> : <Camera size={11} />}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhoto}
              />
            </button>

            <div className="min-w-0 flex-1">
              {renaming ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    className="h-7 w-full rounded border border-accent bg-surface px-2 text-[13px] outline-none"
                  />
                  <button onClick={saveName} className="text-success">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setRenaming(false)} className="text-faint">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRenaming(true)}
                  className="group/name flex items-center gap-1.5 text-left"
                >
                  <span className="truncate text-[14px] font-semibold">{groupName}</span>
                  <Pencil size={12} className="shrink-0 text-faint opacity-0 group-hover/name:opacity-100" />
                </button>
              )}
              <p className="text-[11px] text-faint">{members.length} members</p>
            </div>
          </div>

          {/* Members */}
          <div className="max-h-64 overflow-y-auto py-1">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setOpen(false);
                  onOpenProfile(m.id);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-surface"
              >
                <Avatar name={m.name} src={m.avatar} size="sm" online={m.online} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{m.name}</p>
                  {m.id === meId && <p className="text-[11px] text-faint">You</p>}
                </div>
              </button>
            ))}
          </div>

          <div className="h-px bg-border" />
          <button
            onClick={() => {
              setOpen(false);
              setAddOpen(true);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface"
          >
            <UserPlus size={15} className="text-muted" /> Add people
          </button>
          <button
            onClick={leave}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-surface hover:text-danger"
          >
            <LogOut size={15} /> Leave
          </button>
        </div>
      )}

      <AddPeopleDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        conversationId={conversationId}
        existingIds={members.map((m) => m.id)}
        onAdded={onChanged}
      />
    </div>
  );
}

function AddPeopleDialog({
  open,
  onOpenChange,
  conversationId,
  existingIds,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  conversationId: string;
  existingIds: string[];
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    fetch("/api/friends")
      .then((r) => (r.ok ? r.json() : []))
      .then(setFriends)
      .catch(() => {});
  }, [open]);

  const addable = friends.filter((f) => !existingIds.includes(f.user.id));

  async function add() {
    if (selected.length === 0) return;
    setBusy(true);
    const res = await fetch(`/api/conversations/${conversationId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: selected }),
    });
    setBusy(false);
    if (res.ok) {
      onOpenChange(false);
      onAdded();
      toast("Members added", "success");
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not add members", "error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="Add people" description="Add friends to this group." />
        <div className="p-5">
          <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {addable.length === 0 && (
              <p className="py-3 text-center text-[12px] text-faint">
                All your friends are already in this group.
              </p>
            )}
            {addable.map((f) => {
              const on = selected.includes(f.user.id);
              return (
                <button
                  key={f.user.id}
                  onClick={() =>
                    setSelected((s) =>
                      s.includes(f.user.id) ? s.filter((x) => x !== f.user.id) : [...s, f.user.id]
                    )
                  }
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface"
                >
                  <Avatar name={f.user.name} src={f.user.avatar} size="sm" online={f.online} />
                  <span className="flex-1 truncate text-[13px]">{f.user.name}</span>
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-[4px] border",
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
            <Button onClick={add} disabled={selected.length === 0 || busy}>
              Add {selected.length > 0 && `(${selected.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
