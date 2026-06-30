"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { User as UserIcon, Camera, AtSign } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner, FullSpinner } from "@/components/ui/spinner";
import { CopyButton } from "@/components/ui/copy-button";
import { ThemeSegmented } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { refreshSidebar } from "@/components/layout/app-sidebar";

interface Me {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  publicId: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { update } = useSession();
  const { toast } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data: Me = await res.json();
      setMe(data);
      setName(data.name);
      setUsername(data.username ?? "");
      setBio(data.bio ?? "");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!name.trim()) {
      toast("Name can't be empty", "error");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        username: username.trim() ? username.trim().toLowerCase() : null,
        bio: bio.trim() || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data: Me = await res.json();
      setMe(data);
      setUsername(data.username ?? "");
      await update({ user: { name: data.name, username: data.username } });
      refreshSidebar();
      toast("Profile saved", "success");
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not save profile", "error");
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (res.ok) {
      const { url } = await res.json();
      setMe((m) => (m ? { ...m, avatar: url } : m));
      await update({ user: { image: url } });
      refreshSidebar();
      toast("Photo updated", "success");
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Upload failed", "error");
    }
  }

  if (!me) {
    return (
      <>
        <PageHeader title="Profile" icon={<UserIcon size={16} />} />
        <FullSpinner />
      </>
    );
  }

  const dirty =
    name.trim() !== me.name ||
    (username.trim().toLowerCase() || "") !== (me.username ?? "") ||
    (bio.trim() || "") !== (me.bio ?? "");

  return (
    <>
      <PageHeader title="Profile" icon={<UserIcon size={16} />} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          {/* Avatar + identity */}
          <section className="flex flex-col items-center gap-4 rounded-xl border border-border bg-elevated p-6 sm:flex-row sm:items-center sm:gap-5">
            <div className="relative">
              <Avatar name={me.name} src={me.avatar} size="xl" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-overlay text-muted shadow-sm transition-colors hover:text-text"
                aria-label="Change photo"
              >
                {uploading ? <Spinner size={13} /> : <Camera size={14} />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickAvatar}
              />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-lg font-semibold">{me.name}</p>
              <p className="text-[13px] text-muted">
                {me.username ? `@${me.username}` : me.email}
              </p>
              <p className="mt-1 text-[12px] text-faint">
                Member since {format(new Date(me.createdAt), "MMMM yyyy")}
              </p>
            </div>
          </section>

          {/* Edit form */}
          <section className="mt-5 rounded-xl border border-border bg-elevated p-5">
            <h2 className="text-[13px] font-semibold">Details</h2>
            <div className="mt-3 flex flex-col gap-4">
              <Field label="Display name">
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </Field>

              <Field
                label="Username"
                hint="3–20 characters: letters, numbers, underscore"
              >
                <div className="relative">
                  <AtSign
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                  />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
                    placeholder="yourhandle"
                    className="pl-9"
                  />
                </div>
              </Field>

              <Field label="Bio">
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder="A short line about you (optional)"
                />
              </Field>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={save} disabled={!dirty || saving}>
                {saving ? <Spinner size={15} className="text-white" /> : "Save changes"}
              </Button>
            </div>
          </section>

          {/* Friend code */}
          <section className="mt-5 rounded-xl border border-border bg-elevated p-5">
            <h2 className="text-[13px] font-semibold">Friend code</h2>
            <p className="mt-0.5 text-[12px] text-faint">
              Share this so friends can add you.
            </p>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5">
              <span className="font-mono text-[15px] font-semibold tracking-[0.2em]">
                {me.publicId}
              </span>
              <CopyButton value={me.publicId} size={15} />
            </div>
          </section>

          {/* Appearance */}
          <section className="mt-5 rounded-xl border border-border bg-elevated p-5">
            <h2 className="text-[13px] font-semibold">Appearance</h2>
            <p className="mt-0.5 text-[12px] text-faint">Choose your theme.</p>
            <div className="mt-3">
              <ThemeSegmented />
            </div>
          </section>

          {/* Account */}
          <section className="mt-5 rounded-xl border border-border bg-elevated p-5">
            <h2 className="text-[13px] font-semibold">Account</h2>
            <div className="mt-3 flex items-center justify-between text-[13px]">
              <span className="text-muted">Email</span>
              <span>{me.email}</span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-text/85">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-faint">{hint}</p>}
    </div>
  );
}
