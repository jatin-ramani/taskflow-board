"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Filter, Settings, Search, Plus, MoreHorizontal } from "lucide-react";

interface Task {
  id: string; title: string; dueDate: string | null; status: string;
}

export function ProjectCalendarView({ projectId, onTaskClick }: { projectId: string; onTaskClick: (taskId: string) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(data => {
        const allTasks = data.columns.flatMap((c: any) => c.tasks);
        setTasks(allTasks);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  
  // Simple week view for now (matches mockup)
  const renderWeek = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderTop: "1px solid var(--border)", height: "calc(100vh - 200px)" }}>
        {days.map((day, i) => {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div key={i} style={{ borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)" }}>{day}</span>
                <span style={{ fontSize: "18px", fontWeight: isToday ? 700 : 400, color: isToday ? "var(--accent)" : "var(--text-primary)" }}>{date.getDate()}</span>
              </div>
              <div style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === date.toDateString()).map(t => (
                  <div key={t.id} onClick={() => onTaskClick(t.id)} style={{ padding: "6px 10px", background: "var(--accent-muted)", borderLeft: "4px solid var(--accent)", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", cursor: "pointer" }}>
                    {t.title}
                  </div>
                ))}
                <button style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-tertiary)", fontSize: "12px", background: "transparent", border: "none", cursor: "pointer", padding: "4px" }}>
                  <Plus size={14} /> Add task
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div style={{ padding: "40px", color: "var(--text-tertiary)" }}>Loading calendar...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Calendar Toolbar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button style={{ padding: "6px 16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}><Plus size={14} /> Add task</button>
          
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} style={{ padding: "4px", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><ChevronLeft size={18} /></button>
            <button onClick={() => setCurrentDate(new Date())} style={{ padding: "4px 10px", background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}>Today</button>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} style={{ padding: "4px", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><ChevronRight size={18} /></button>
          </div>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>{currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", background: "transparent", border: "none" }}><MoreHorizontal size={16} /> Weeks</button>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", background: "transparent", border: "none" }}><Filter size={16} /> Filter</button>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", background: "transparent", border: "none" }}><Settings size={16} /> Options</button>
          <button style={{ padding: "4px", color: "var(--text-tertiary)", background: "transparent", border: "none" }}><Search size={18} /></button>
        </div>
      </div>

      {renderWeek()}
    </div>
  );
}
