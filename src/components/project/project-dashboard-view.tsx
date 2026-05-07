"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { Filter, MoreHorizontal, Maximize2, Edit2, Plus, Share2, Info } from "lucide-react";

interface ProjectDashboardProps { projectId: string; }

export function ProjectDashboardView({ projectId }: ProjectDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(project => {
        const allTasks = project.columns.flatMap((c: any) => c.tasks);
        const completed = allTasks.filter((t: any) => t.status === "DONE").length;
        const incomplete = allTasks.length - completed;
        const overdue = allTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;

        const sectionData = project.columns.map((c: any) => ({ name: c.name, value: c.tasks.length }));

        const trendData = [
          { date: "04/23", total: 0, completed: 0 },
          { date: "04/25", total: 0, completed: 0 },
          { date: "04/27", total: 0, completed: 0 },
          { date: "04/29", total: 0, completed: 0 },
          { date: "05/01", total: 0, completed: 0 },
          { date: "05/03", total: 0, completed: 0 },
          { date: "05/05", total: allTasks.length > 0 ? allTasks.length - 1 : 0, completed: 0 },
          { date: "05/07", total: allTasks.length, completed: completed },
        ];

        setData({
          stats: [
            { label: "Total completed tasks", value: completed, color: "var(--success)" },
            { label: "Total incomplete tasks", value: incomplete, color: "var(--warning)" },
            { label: "Total overdue tasks", value: overdue, color: "var(--danger)" },
            { label: "Total tasks", value: allTasks.length, color: "var(--text-primary)" },
          ],
          sectionData,
          trendData,
          pieData: [
            { name: "Incomplete", value: incomplete, color: "#a5b4fc" },
            { name: "Completed", value: completed, color: "#6366f1" },
          ]
        });
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div style={{ padding: "40px", color: "var(--text-tertiary)" }}>Loading dashboard...</div>;

  const Card = ({ title, children, showActions = true }: any) => (
    <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "20px", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{title}</h3>
        {showActions && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}><Maximize2 size={14} /></button>
            <button style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}><Edit2 size={14} /></button>
            <button style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}><MoreHorizontal size={14} /></button>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minHeight: "240px" }}>{children}</div>
      <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "11px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "4px" }}><Filter size={10} /> 1 Filter</div>
        <button style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-tertiary)", border: "none", padding: "4px 8px", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>See all</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px", height: "100%", overflowY: "auto", background: "var(--bg-primary)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: "var(--radius-md)", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "var(--text-primary)" }}>
          <Plus size={14} /> Add widget
        </button>
        <button style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: "12px", cursor: "pointer" }}>Send feedback</button>
      </div>

      {/* Top Row: Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        {data.stats.map((stat: any, i: number) => (
          <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "24px", position: "relative" }}>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>{stat.label}</div>
            <div style={{ fontSize: "42px", fontWeight: 400, color: "var(--text-primary)" }}>{stat.value}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "20px", fontSize: "11px", color: "var(--text-tertiary)" }}>
              <Filter size={10} /> {i === 3 ? "No Filters" : "1 Filter"}
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card title="Total tasks by section">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.sectionData} layout="vertical" margin={{ left: -20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} width={100} tick={{ fill: "var(--text-tertiary)" }} />
              <Tooltip cursor={{ fill: "var(--bg-tertiary)" }} contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }} />
              <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tasks by completion status this upcoming month">
          <div style={{ display: "flex", height: "100%", alignItems: "center" }}>
            <ResponsiveContainer width="60%" height={240}>
              <PieChart>
                <Pie data={data.pieData} innerRadius={65} outerRadius={85} paddingAngle={2} dataKey="value">
                  {data.pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, paddingLeft: "20px" }}>
              <div style={{ fontSize: "42px", fontWeight: 400, marginBottom: "20px" }}>{data.stats[3].value}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {data.pieData.map((d: any) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: d.color }} />
                    <span style={{ color: "var(--text-secondary)" }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card title="Total tasks by project">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[{ name: "Project", value: data.stats[3].value }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: "var(--text-tertiary)" }} />
              <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{ fill: "var(--text-tertiary)" }} />
              <Tooltip contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Task completion over time">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: "var(--text-tertiary)" }} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: "var(--text-tertiary)" }} />
              <Tooltip contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }} />
              <Area type="monotone" dataKey="total" stroke="#e2e8f0" fill="transparent" />
              <Area type="monotone" dataKey="completed" stroke="#6366f1" fill="#6366f133" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", marginTop: "12px", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}><div style={{ width: "8px", height: "8px", background: "#e2e8f0" }} /> Total</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}><div style={{ width: "8px", height: "8px", background: "#6366f1" }} /> Completed</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
