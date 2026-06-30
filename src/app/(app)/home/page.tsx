"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  FolderKanban,
  ListTodo,
  CheckCircle2,
  Clock4,
  AlertTriangle,
  Trophy,
  CalendarClock,
  ChevronRight,
  Inbox as InboxIcon,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { MobileMenuButton } from "@/components/layout/app-shell";

interface ProjProgress {
  id: string;
  name: string;
  color: string;
  dueDate: string | null;
  total: number;
  done: number;
  pct: number;
  daysToGo?: number;
}
interface DashData {
  kpis: { totalProjects: number; totalTasks: number; completedTasks: number; pendingTasks: number; overdueTasks: number };
  leaderboard: { user: { id: string; name: string; avatar: string | null }; points: number }[];
  myPoints: number;
  myRank: number | null;
  taskActivity: { label: string; count: number }[];
  tasksForToday: { id: string; title: string; project: { id: string; name: string; color: string } }[];
  overallDueTasks: { id: string; title: string; dueDate: string | null; project: { id: string; name: string; color: string } }[];
  activeProjects: ProjProgress[];
  overdueProjects: ProjProgress[];
  projectsLaunch: ProjProgress[];
}

const KPIS = [
  { key: "totalProjects", label: "Total Projects", icon: FolderKanban, color: "#4f9dff" },
  { key: "totalTasks", label: "Total Tasks", icon: ListTodo, color: "#f5a623" },
  { key: "completedTasks", label: "Completed Tasks", icon: CheckCircle2, color: "#22c55e" },
  { key: "pendingTasks", label: "Pending Tasks", icon: Clock4, color: "#a855f7" },
  { key: "overdueTasks", label: "Overdue Tasks", icon: AlertTriangle, color: "#ef4444" },
] as const;

export default function DashboardPage() {
  const { data: session } = useSession();
  const name = session?.user?.name?.split(" ")[0] ?? "there";
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-13 shrink-0 items-center gap-2 border-b border-border px-4 sm:px-6">
        <MobileMenuButton />
        <div>
          <p className="text-[11px] text-faint">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="text-[15px] font-semibold leading-tight">{greeting}, {name}</h1>
        </div>
      </header>

      {!data ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size={22} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {KPIS.map((k) => (
              <div
                key={k.key}
                className="flex items-center gap-3 rounded-lg border border-border bg-elevated p-3.5 shadow-sm"
                style={{ borderLeft: `3px solid ${k.color}` }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `${k.color}1a` }}>
                  <k.icon size={18} style={{ color: k.color }} />
                </span>
                <div>
                  <p className="text-[22px] font-bold leading-none">{data.kpis[k.key]}</p>
                  <p className="mt-1 text-[11px] text-muted">{k.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
            {/* Main column */}
            <div className="flex min-w-0 flex-col gap-4">
              {/* Leaderboard */}
              <Widget title="Leaderboard" action={<ViewAll href="/friends" />}>
                {data.leaderboard.length === 0 ? (
                  <Empty icon={<Trophy size={22} />} text="No leaderboard data yet" />
                ) : (
                  <div className="flex flex-col">
                    {data.leaderboard.map((l, i) => (
                      <div key={l.user.id} className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0">
                        <span className="w-4 text-center text-[12px] font-semibold text-faint">{i + 1}</span>
                        <Avatar name={l.user.name} src={l.user.avatar} size="sm" />
                        <span className="flex-1 truncate text-[13px] font-medium">{l.user.name}</span>
                        <span className="flex items-center gap-1 text-[12px] font-semibold text-accent">
                          <Trophy size={12} /> {l.points}pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Widget>

              {/* Task Activity */}
              <Widget title="Task Activity">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.taskActivity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="actcolor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f9dff" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#4f9dff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-faint)" }} interval={1} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--color-faint)" }} />
                    <Tooltip contentStyle={{ background: "var(--color-overlay)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke="#4f9dff" strokeWidth={2} fill="url(#actcolor)" dot={{ r: 3, fill: "#4f9dff" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Widget>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Overall due */}
                <Widget title="Overall Due Tasks" action={<ViewAll href="/my-tasks" />}>
                  {data.overallDueTasks.length === 0 ? (
                    <Empty icon={<CalendarClock size={22} />} text="No overall due tasks" />
                  ) : (
                    <TaskList items={data.overallDueTasks} showDue />
                  )}
                </Widget>
                {/* Tasks for today */}
                <Widget title="Tasks for Today" action={<ViewAll href="/my-tasks" />}>
                  {data.tasksForToday.length === 0 ? (
                    <Empty icon={<ListTodo size={22} />} text="No tasks for today" />
                  ) : (
                    <TaskList items={data.tasksForToday} />
                  )}
                </Widget>
              </div>
            </div>

            {/* Right rail */}
            <div className="flex flex-col gap-4">
              {/* Points */}
              <div className="overflow-hidden rounded-lg border border-border bg-linear-to-br from-accent to-[#7c5cff] p-4 text-white shadow-sm">
                <div className="flex items-center gap-2 text-[12px] opacity-90">
                  <Trophy size={15} /> Your Leaderboard Points
                </div>
                <p className="mt-1 text-[28px] font-bold leading-none">{data.myPoints}</p>
                <p className="mt-2 text-[12px] opacity-90">
                  {data.myRank ? `You're #${data.myRank} on the leaderboard 🎉` : "Complete tasks to climb the board!"}
                </p>
              </div>

              {/* Active projects */}
              <Widget title="Active Projects" action={<ViewAll href="/projects" />} dense>
                {data.activeProjects.length === 0 ? (
                  <Empty icon={<FolderKanban size={20} />} text="No active projects" />
                ) : (
                  data.activeProjects.map((p) => <ProjectRow key={p.id} p={p} />)
                )}
              </Widget>

              {/* Overdue projects */}
              {data.overdueProjects.length > 0 && (
                <Widget title="Overdue Projects" dense>
                  {data.overdueProjects.map((p) => (
                    <ProjectRow key={p.id} p={p} overdue />
                  ))}
                </Widget>
              )}

              {/* Projects launch — countdown rings */}
              {data.projectsLaunch.length > 0 && (
                <Widget title="Projects Launch" dense>
                  <div className="flex flex-col gap-3 pt-1">
                    {data.projectsLaunch.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: p.color }}>
                          {p.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold uppercase">{p.name}</p>
                          <p className="flex items-center gap-1 text-[11px] text-faint">
                            <CalendarDays size={11} />
                            {p.dueDate ? format(new Date(p.dueDate), "EEE, MMM d, yyyy") : ""}
                          </p>
                        </div>
                        <Ring days={p.daysToGo ?? 0} />
                      </div>
                    ))}
                  </div>
                </Widget>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Widget({ title, action, children, dense }: { title: string; action?: React.ReactNode; children: React.ReactNode; dense?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-elevated shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {action}
      </div>
      <div className={cn(dense ? "px-3 py-1.5" : "px-4 py-2")}>{children}</div>
    </div>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-0.5 text-[11px] font-medium text-accent hover:underline">
      View All <ChevronRight size={12} />
    </Link>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-faint">
      <span className="text-faint/70">{icon}</span>
      <p className="text-[12px]">{text}</p>
    </div>
  );
}

function TaskList({ items, showDue }: { items: { id: string; title: string; dueDate?: string | null; project: { id: string; name: string; color: string } }[]; showDue?: boolean }) {
  return (
    <div className="flex flex-col">
      {items.map((t) => (
        <Link key={t.id} href={`/projects/${t.project.id}`} className="flex items-center gap-2 border-b border-border/60 py-2 last:border-0 hover:opacity-80">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: t.project.color }} />
          <span className="min-w-0 flex-1 truncate text-[12px]">{t.title}</span>
          {showDue && t.dueDate && (
            <span className="shrink-0 text-[11px] text-danger">{format(new Date(t.dueDate), "MMM d")}</span>
          )}
          <span className="shrink-0 truncate text-[11px] text-faint">{t.project.name}</span>
        </Link>
      ))}
    </div>
  );
}

function ProjectRow({ p, overdue }: { p: ProjProgress; overdue?: boolean }) {
  return (
    <Link href={`/projects/${p.id}`} className="flex items-center gap-2.5 border-b border-border/60 py-2 last:border-0 hover:opacity-80">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: p.color }}>
        {p.name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium">{p.name}</p>
        <p className="text-[11px] text-faint">{p.pct}% · {p.total} tasks</p>
      </div>
      {overdue && p.dueDate && (
        <span className="shrink-0 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
          {format(new Date(p.dueDate), "d MMM")}
        </span>
      )}
    </Link>
  );
}

function Ring({ days }: { days: number }) {
  const cap = 180;
  const frac = Math.max(0.06, Math.min(1, days / cap));
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-surface)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-bold leading-none">{days}</span>
        <span className="text-[7px] text-faint">days</span>
      </div>
    </div>
  );
}
