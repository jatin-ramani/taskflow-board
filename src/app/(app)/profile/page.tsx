"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  User as UserIcon,
  Camera,
  AtSign,
  Plus,
  CheckCircle2,
  ArrowRightLeft,
  UserPlus,
  Pencil,
  MessageSquare,
  Trash2,
  RotateCcw,
  Activity as ActivityIcon,
  FolderKanban,
  Target,
  KeyRound,
  Palette,
  Mail,
  CalendarDays,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner, FullSpinner } from "@/components/ui/spinner";
import { CopyButton } from "@/components/ui/copy-button";
import { ThemeSegmented } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import { cn, timeAgo } from "@/lib/utils";

interface ProjectProgress {
  id: string;
  name: string;
  color: string;
  total: number;
  done: number;
  pct: number;
}
interface GoalItem {
  id: string;
  title: string;
  progress: number;
  targetDate: string | null;
}
interface ActivityItem {
  id: string;
  action: string;
  createdAt: string;
  taskTitle: string | null;
  projectName: string | null;
  projectColor: string | null;
}
interface Me {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  publicId: string;
  createdAt: string;
  stats?: {
    projects: number;
    tasksDone: number;
    tasksOpen: number;
    friends: number;
    goals: number;
  };
  projects?: ProjectProgress[];
  goals?: GoalItem[];
  recentActivity?: ActivityItem[];
}

const ACTIVITY_META: Record<string, { icon: LucideIcon; verb: string; color: string }> = {
  CREATED: { icon: Plus, verb: "created", color: "text-accent" },
  COMPLETED: { icon: CheckCircle2, verb: "completed", color: "text-success" },
  MOVED: { icon: ArrowRightLeft, verb: "moved", color: "text-warning" },
  ASSIGNED: { icon: UserPlus, verb: "assigned", color: "text-accent" },
  UPDATED: { icon: Pencil, verb: "updated", color: "text-muted" },
  COMMENTED: { icon: MessageSquare, verb: "commented on", color: "text-muted" },
  DELETED: { icon: Trash2, verb: "deleted", color: "text-danger" },
  REOPENED: { icon: RotateCcw, verb: "reopened", color: "text-warning" },
};

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
      setMe((m) => ({ ...(m as Me), ...data }));
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

  const stats = me.stats;
  const totalTasks = (stats?.tasksDone ?? 0) + (stats?.tasksOpen ?? 0);
  const completionPct = totalTasks ? Math.round(((stats?.tasksDone ?? 0) / totalTasks) * 100) : 0;

  return (
    <>
      <PageHeader title="Profile" icon={<UserIcon size={16} />} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          {/* ---------- Hero ---------- */}
          <section className="overflow-hidden rounded-lg border border-border bg-elevated shadow-sm">
            <div className="h-28 bg-linear-to-r from-accent via-accent to-[#7174d4] sm:h-32" />
            <div className="px-5 pb-5 sm:px-7">
              {/* Avatar — sits in a solid disc so it reads cleanly over both
                  the blue cover and the white card below. */}
              <div className="relative -mt-14 flex w-fit rounded-full bg-elevated p-1.5 sm:-mt-16">
                <Avatar name={me.name} src={me.avatar} size="2xl" />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-overlay text-muted shadow-sm transition-colors hover:text-text"
                  aria-label="Change photo"
                >
                  {uploading ? <Spinner size={14} /> : <Camera size={15} />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickAvatar}
                />
              </div>

              {/* Identity — stacked below the avatar */}
              <div className="mt-3.5">
                <p className="text-2xl font-semibold">{me.name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                  {me.username && (
                    <span className="font-medium text-text/80">@{me.username}</span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={13} /> {me.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={13} /> Joined{" "}
                    {format(new Date(me.createdAt), "MMM yyyy")}
                  </span>
                </div>
              </div>

              {me.bio && (
                <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">{me.bio}</p>
              )}

              {/* Stats strip */}
              {stats && (
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 sm:grid-cols-5">
                  <Stat label="Projects" value={stats.projects} />
                  <Stat label="Open tasks" value={stats.tasksOpen} />
                  <Stat label="Completed" value={stats.tasksDone} accent="success" />
                  <Stat label="Friends" value={stats.friends} />
                  <Stat label="Goals" value={stats.goals} />
                </div>
              )}
            </div>
          </section>

          {/* ---------- 2-column body ---------- */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            {/* Main column */}
            <div className="flex min-w-0 flex-col gap-4">
              {/* Edit details */}
              <Card title="Edit profile" icon={<Pencil size={14} />}>
                <div className="flex flex-col gap-4">
                  <Field label="Display name">
                    <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                  </Field>
                  <Field label="Username" hint="3–20 characters: letters, numbers, underscore">
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
                <div className="mt-4 flex items-center justify-end gap-3">
                  {dirty && <span className="text-[12px] text-faint">Unsaved changes</span>}
                  <Button onClick={save} disabled={!dirty || saving}>
                    {saving ? <Spinner size={15} className="text-white" /> : "Save changes"}
                  </Button>
                </div>
              </Card>

              {/* Recent activity */}
              <Card title="Recent activity" icon={<ActivityIcon size={14} />}>
                {me.recentActivity && me.recentActivity.length > 0 ? (
                  <ul className="flex flex-col gap-3.5">
                    {me.recentActivity.map((a) => {
                      const meta = ACTIVITY_META[a.action] ?? {
                        icon: ActivityIcon,
                        verb: a.action.toLowerCase(),
                        color: "text-muted",
                      };
                      const Icon = meta.icon;
                      return (
                        <li key={a.id} className="flex items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface",
                              meta.color
                            )}
                          >
                            <Icon size={13} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] leading-snug">
                              <span className="font-medium">{meta.verb}</span>{" "}
                              {a.taskTitle ? (
                                <span className="text-text">“{a.taskTitle}”</span>
                              ) : (
                                <span className="text-muted">a task</span>
                              )}
                              {a.projectName && (
                                <span className="text-muted"> in {a.projectName}</span>
                              )}
                            </p>
                            <p className="mt-0.5 text-[11px] text-faint">{timeAgo(a.createdAt)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyRow icon={<ActivityIcon size={18} />} text="No activity yet." />
                )}
              </Card>

              {/* Projects */}
              <Card
                title="Your projects"
                icon={<FolderKanban size={14} />}
                action={
                  <Link
                    href="/projects"
                    className="flex items-center gap-0.5 text-[12px] font-medium text-accent hover:underline"
                  >
                    View all <ChevronRight size={13} />
                  </Link>
                }
              >
                {me.projects && me.projects.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {me.projects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className="group block rounded-lg transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: p.color }}
                            />
                            <span className="truncate text-[13px] font-medium group-hover:text-accent">
                              {p.name}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] text-faint">
                            {p.done}/{p.total} tasks
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${p.pct}%`, background: p.color }}
                            />
                          </div>
                          <span className="w-9 shrink-0 text-right text-[11px] font-medium text-muted">
                            {p.pct}%
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyRow icon={<FolderKanban size={18} />} text="You're not in any projects yet." />
                )}
              </Card>
            </div>

            {/* Sidebar column */}
            <div className="flex flex-col gap-4">
              {/* At a glance */}
              <Card title="At a glance" icon={<CheckCircle2 size={14} />}>
                <div className="flex items-center gap-4">
                  <Ring pct={completionPct} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">Task completion</p>
                    <p className="mt-0.5 text-[12px] text-faint">
                      {stats?.tasksDone ?? 0} of {totalTasks} assigned tasks done
                    </p>
                    <div className="mt-3 flex gap-4">
                      <MiniStat dotClass="bg-success" label="Done" value={stats?.tasksDone ?? 0} />
                      <MiniStat dotClass="bg-accent" label="Open" value={stats?.tasksOpen ?? 0} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Goals */}
              <Card title="Active goals" icon={<Target size={14} />}>
                {me.goals && me.goals.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {me.goals.map((g) => (
                      <div key={g.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium">{g.title}</span>
                          <span className="shrink-0 text-[11px] font-medium text-muted">
                            {g.progress}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${g.progress}%` }}
                          />
                        </div>
                        {g.targetDate && (
                          <p className="mt-1 text-[11px] text-faint">
                            Due {format(new Date(g.targetDate), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyRow icon={<Target size={18} />} text="No active goals." />
                )}
              </Card>

              {/* Friend code */}
              <Card title="Friend code" icon={<KeyRound size={14} />}>
                <p className="text-[12px] text-faint">Share this so friends can add you.</p>
                <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5">
                  <span className="font-mono text-[15px] font-semibold tracking-[0.2em]">
                    {me.publicId}
                  </span>
                  <CopyButton value={me.publicId} size={15} />
                </div>
              </Card>

              {/* Appearance */}
              <Card title="Appearance" icon={<Palette size={14} />}>
                <p className="mb-3 text-[12px] text-faint">Choose your theme.</p>
                <ThemeSegmented />
              </Card>

              {/* Account */}
              <Card title="Account" icon={<UserIcon size={14} />}>
                <div className="flex flex-col gap-2.5 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-muted">
                      <Mail size={14} /> Email
                    </span>
                    <span className="truncate">{me.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-muted">
                      <CalendarDays size={14} /> Member since
                    </span>
                    <span>{format(new Date(me.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Small pieces ---------- */

function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-elevated shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold">
          {icon && <span className="text-muted">{icon}</span>}
          {title}
        </h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success";
}) {
  return (
    <div className="text-center sm:text-left">
      <p
        className={cn(
          "text-[20px] font-semibold leading-none",
          accent === "success" && "text-success"
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11px] uppercase tracking-wide text-faint">{label}</p>
    </div>
  );
}

function MiniStat({
  dotClass,
  label,
  value,
}: {
  dotClass: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      <span className="text-[12px] text-muted">
        {label} <span className="font-semibold text-text">{value}</span>
      </span>
    </div>
  );
}

function Ring({ pct, size = 76, stroke = 8 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--c-surface)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--c-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-semibold">
        {pct}%
      </span>
    </div>
  );
}

function EmptyRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <span className="text-faint">{icon}</span>
      <p className="text-[12px] text-faint">{text}</p>
    </div>
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
