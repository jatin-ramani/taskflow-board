"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  CalendarClock,
  Clock,
  Timer,
  DollarSign,
  ListChecks,
  BarChart3,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/common/empty-state";
import type { ProjectDashboardDTO } from "@/types";

const PALETTE = ["#5b5fc7", "#3b82f6", "#16a34a", "#f59e0b", "#eb5757", "#a855f7", "#0ea5e9", "#ec4899"];

const tooltipStyle = {
  background: "var(--color-overlay)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--color-text)",
};

function hm(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (!h && !m) return "0h";
  return `${h ? `${h}h ` : ""}${m ? `${m}m` : ""}`.trim();
}

export function DashboardView({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ProjectDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/dashboard`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={22} />
      </div>
    );
  if (!data) return null;

  if (data.totals.total === 0)
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<BarChart3 size={20} />}
          title="No data yet"
          description="Add tasks to this project to see reporting and charts."
        />
      </div>
    );

  const loggedH = data.loggedSeconds / 3600;
  const estH = data.estimateMinutes / 60;
  const estVsLog = [
    { name: "Estimated", value: Math.round(estH * 10) / 10, fill: "#5b5fc7" },
    { name: "Logged", value: Math.round(loggedH * 10) / 10, fill: "#16a34a" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi icon={<ListChecks size={15} />} label="Total tasks" value={data.totals.total} />
          <Kpi icon={<Circle size={15} />} label="Open" value={data.totals.open} tone="accent" />
          <Kpi icon={<CheckCircle2 size={15} />} label="Completed" value={data.totals.completed} tone="success" />
          <Kpi icon={<AlertTriangle size={15} />} label="Overdue" value={data.totals.overdue} tone="danger" />
          <Kpi icon={<CalendarClock size={15} />} label="Due today" value={data.totals.dueToday} />
          <Kpi icon={<Timer size={15} />} label="Estimated" value={`${Math.round(estH * 10) / 10}h`} />
          <Kpi icon={<Clock size={15} />} label="Logged" value={hm(data.loggedSeconds)} tone="success" />
          <Kpi icon={<DollarSign size={15} />} label="Billable" value={data.billable} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* By status */}
          <Card title="Tasks by status">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byStatus} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-faint)" }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-faint)" }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-surface)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.byStatus.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* By priority (donut) */}
          <Card title="By priority">
            {data.byPriority.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.byPriority} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {data.byPriority.map((p, i) => (
                      <Cell key={i} fill={p.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <Legend items={data.byPriority.map((p) => ({ name: p.name, color: p.color, value: p.count }))} />
          </Card>

          {/* By assignee */}
          <Card title="Tasks by assignee">
            {data.byAssignee.length === 0 ? (
              <Empty />
            ) : (
              <div className="flex flex-col gap-2.5 py-1">
                {data.byAssignee.slice(0, 8).map((a, i) => {
                  const max = data.byAssignee[0].count || 1;
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <Avatar name={a.name} src={a.avatar} size="xs" />
                      <span className="w-24 shrink-0 truncate text-[12px]">{a.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full" style={{ width: `${(a.count / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                      </div>
                      <span className="w-6 shrink-0 text-right text-[12px] font-medium">{a.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* By type (donut) */}
          <Card title="By task type">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.byType} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.byType.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <Legend items={data.byType.map((t, i) => ({ name: t.name, color: PALETTE[i % PALETTE.length], value: t.count }))} />
          </Card>

          {/* Estimated vs logged */}
          <Card title="Estimated vs logged (hours)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={estVsLog} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-faint)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-faint)" }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-surface)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {estVsLog.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Worklog leaderboard */}
          <Card title="Work log leaderboard">
            {data.leaderboard.length === 0 ? (
              <Empty label="No time logged yet" />
            ) : (
              <div className="flex flex-col gap-2.5 py-1">
                {data.leaderboard.slice(0, 8).map((l, i) => {
                  const max = data.leaderboard[0].seconds || 1;
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <Avatar name={l.name} src={l.avatar} size="xs" />
                      <span className="w-24 shrink-0 truncate text-[12px]">{l.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-success" style={{ width: `${(l.seconds / max) * 100}%` }} />
                      </div>
                      <span className="w-12 shrink-0 text-right text-[12px] font-medium">{hm(l.seconds)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Milestone progress */}
        {data.milestones.length > 0 && (
          <Card title="Milestone progress" className="mt-4">
            <div className="grid grid-cols-1 gap-3 py-1 sm:grid-cols-2">
              {data.milestones.map((m, i) => (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.color }} />
                      {m.name}
                    </span>
                    <span className="text-faint">{m.done}/{m.total}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone?: "accent" | "success" | "danger" }) {
  const toneCls =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : "text-muted";
  return (
    <div className="rounded-lg border border-border bg-elevated p-3.5">
      <div className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide ${toneCls}`}>
        {icon}
        {label}
      </div>
      <p className="text-[22px] font-semibold leading-none">{value}</p>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-elevated p-4 ${className}`}>
      <h3 className="mb-3 text-[13px] font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { name: string; color: string; value: number }[] }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          {it.name} <span className="text-faint">({it.value})</span>
        </span>
      ))}
    </div>
  );
}

function Empty({ label = "No data" }: { label?: string }) {
  return <div className="flex h-[200px] items-center justify-center text-[12px] text-faint">{label}</div>;
}
