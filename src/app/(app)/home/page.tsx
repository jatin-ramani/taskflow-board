"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ListTodo,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Hash,
  ArrowRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";
import { Spinner } from "@/components/ui/spinner";
import { PriorityDot, DueDate } from "@/components/board/task-card";
import { TaskDetailPanel } from "@/components/task/task-detail-panel";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import { MobileMenuButton } from "@/components/layout/app-shell";
import type {
  DashboardStats,
  MyTaskDTO,
  ProjectSummary,
  PublicUser,
} from "@/types";

type Tab = "upcoming" | "overdue" | "completed";

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<MyTaskDTO[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, t, p] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/tasks?scope=mine"),
      fetch("/api/projects"),
    ]);
    if (s.ok) setStats(await s.json());
    if (t.ok) setTasks(await t.json());
    if (p.ok) setProjects(await p.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const me: PublicUser | null = user
    ? {
        id: user.id,
        name: user.name ?? "Me",
        publicId: user.publicId,
        username: user.username,
        avatar: user.image ?? null,
      }
    : null;

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const grouped = useMemo(() => {
    const upcoming = tasks.filter((t) => !t.completedAt);
    const overdue = upcoming.filter(
      (t) => t.dueDate && new Date(t.dueDate) < startToday
    );
    const completed = tasks.filter((t) => t.completedAt);
    return { upcoming, overdue, completed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const tabList = grouped[tab];

  async function toggle(task: MyTaskDTO) {
    const completed = !task.completedAt;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, completedAt: completed ? new Date().toISOString() : null }
          : t
      )
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    load();
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={22} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <MobileMenuButton className="-ml-1 mt-1" />
            <div>
              <p className="text-[13px] text-muted">{dateStr}</p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">
                {greeting}, {user?.name?.split(" ")[0]}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 text-[13px]">
            <CheckCircle2 size={15} className="text-success" />
            <span className="font-medium">{stats?.completedThisWeek ?? 0}</span>
            <span className="text-muted">
              <span className="hidden sm:inline">completed </span>this week
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<ListTodo size={15} />}
            label="Active tasks"
            value={stats?.activeCount ?? 0}
            color="#5b5fc7"
          />
          <StatCard
            icon={<CalendarClock size={15} />}
            label="Due today"
            value={stats?.dueTodayCount ?? 0}
            color="#f2c94c"
          />
          <StatCard
            icon={<AlertTriangle size={15} />}
            label="Overdue"
            value={stats?.overdueCount ?? 0}
            color="#eb5757"
          />
          <StatCard
            icon={<CheckCircle2 size={15} />}
            label="Completed"
            value={stats?.completedCount ?? 0}
            color="#4cb782"
          />
        </div>

        {/* Two columns */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* My tasks widget */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-border bg-elevated">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                  <CheckSquare size={16} className="text-muted" /> My tasks
                </h2>
                <Link
                  href="/my-tasks"
                  className="flex items-center gap-1 text-[12px] text-muted transition-colors hover:text-text"
                >
                  View all <ArrowRight size={12} />
                </Link>
              </div>

              <div className="flex gap-5 border-b border-border px-5">
                {(["upcoming", "overdue", "completed"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "-mb-px border-b-2 py-2.5 text-[13px] font-medium capitalize transition-colors",
                      tab === t
                        ? "border-text text-text"
                        : "border-transparent text-faint hover:text-muted"
                    )}
                  >
                    {t}
                    <span className="ml-1.5 text-faint">{grouped[t].length}</span>
                  </button>
                ))}
              </div>

              <div className="p-2">
                {tabList.length === 0 ? (
                  <p className="px-3 py-8 text-center text-[13px] text-faint">
                    {tab === "completed"
                      ? "Nothing completed yet"
                      : tab === "overdue"
                        ? "Nothing overdue — nice"
                        : "No upcoming tasks"}
                  </p>
                ) : (
                  tabList.slice(0, 8).map((task) => {
                    const done = !!task.completedAt;
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-surface"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(task);
                          }}
                          className={cn(
                            "flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border transition-colors",
                            done
                              ? "border-success bg-success text-white"
                              : "border-faint hover:border-text"
                          )}
                        >
                          {done && <Check size={10} />}
                        </button>
                        <PriorityDot priority={task.priority} />
                        <span
                          className={cn(
                            "flex-1 truncate text-[13px]",
                            done && "text-faint line-through"
                          )}
                        >
                          {task.title}
                        </span>
                        <span className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] text-faint">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: task.project.color }}
                          />
                          {task.project.name}
                        </span>
                        <DueDate date={task.dueDate} done={done} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            {/* Projects */}
            <div className="overflow-hidden rounded-xl border border-border bg-elevated">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-[14px] font-semibold">Projects</h2>
                <span className="text-[12px] text-faint">{projects.length}</span>
              </div>
              <div className="p-1.5">
                {projects.slice(0, 6).map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ background: `${p.color}22` }}
                    >
                      <Hash size={13} style={{ color: p.color }} />
                    </span>
                    <span className="flex-1 truncate text-[13px]">{p.name}</span>
                    <span className="text-[11px] text-faint">{p.taskCount}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Friend code */}
            <div className="rounded-xl border border-border bg-elevated p-4">
              <p className="text-[12px] font-medium text-muted">Your friend code</p>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
                <span className="font-mono text-[15px] font-semibold tracking-[0.2em]">
                  {user?.publicId}
                </span>
                {user?.publicId && <CopyButton value={user.publicId} size={15} />}
              </div>
              <Link
                href="/friends"
                className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[12px] text-muted transition-colors hover:bg-surface hover:text-text"
              >
                Add friends <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          members={me ? [me] : []}
          canEdit
          onClose={() => setSelectedTaskId(null)}
          onChanged={() => {
            load();
            refreshSidebar();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated p-4">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${color}22`, color }}
        >
          {icon}
        </span>
        <span className="text-[12px] text-muted">{label}</span>
      </div>
      <p className="mt-2.5 text-[26px] font-semibold tabular-nums leading-none">
        {value}
      </p>
    </div>
  );
}
