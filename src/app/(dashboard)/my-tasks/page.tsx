"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Calendar, Clock, Loader2, Flag } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { TaskDetailPanel } from "@/components/task/task-detail-panel";

interface Task {
  id: string; title: string; priority: string; status: string; dueDate: string | null; totalTimeLogged: number;
  project: { id: string; name: string; color: string };
  column: { name: string; color: string };
  _count: { subtasks: number; comments: number };
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");

  const fetchTasks = async () => {
    try { const r = await fetch("/api/tasks?myTasks=true"); if (r.ok) setTasks(await r.json()); } catch {} finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTasks(); }, []);

  const toggleDone = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    fetchTasks();
  };

  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "todo") return t.status === "TODO";
    if (filter === "in_progress") return t.status === "IN_PROGRESS" || t.status === "IN_REVIEW";
    if (filter === "done") return t.status === "DONE";
    return true;
  });

  const overdue = filtered.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE");
  const today = filtered.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString() && t.status !== "DONE");
  const upcoming = filtered.filter((t) => t.dueDate && new Date(t.dueDate) > new Date() && t.status !== "DONE" && new Date(t.dueDate).toDateString() !== new Date().toDateString());
  const noDue = filtered.filter((t) => !t.dueDate && t.status !== "DONE");
  const done = filtered.filter((t) => t.status === "DONE");

  const priorityColors: Record<string, string> = { URGENT: "#ff5630", HIGH: "#ff8b00", MEDIUM: "#ffab00", LOW: "#36b37e", NONE: "var(--text-tertiary)" };

  const renderSection = (title: string, items: Task[], color?: string) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: color || "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title} ({items.length})</div>
        {items.map((task) => (
          <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 8px", borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "var(--transition-fast)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <button onClick={(e) => { e.stopPropagation(); toggleDone(task.id, task.status); }} style={{ background: "none", border: "none", cursor: "pointer", color: task.status === "DONE" ? "var(--success)" : "var(--text-tertiary)", display: "flex" }}>
              {task.status === "DONE" ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            </button>
            <div onClick={() => setSelectedTaskId(task.id)} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 500, textDecoration: task.status === "DONE" ? "line-through" : "none", color: task.status === "DONE" ? "var(--text-tertiary)" : "var(--text-primary)" }}>{task.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: task.project.color }} />{task.project.name}
                </span>
                {task.priority !== "NONE" && <span style={{ fontSize: "11px", color: priorityColors[task.priority], display: "flex", alignItems: "center", gap: "3px" }}><Flag size={10} />{task.priority}</span>}
                {task.dueDate && <span style={{ fontSize: "11px", color: new Date(task.dueDate) < new Date() ? "var(--danger)" : "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "3px" }}><Calendar size={10} />{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                {task.totalTimeLogged > 0 && <span style={{ fontSize: "11px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "3px" }}><Clock size={10} />{formatDuration(task.totalTimeLogged)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", color: "var(--text-tertiary)" }}><Loader2 size={24} className="animate-spin" /></div>;

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>My Tasks</h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: "14px", marginTop: "4px" }}>{tasks.length} total tasks</p>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["all", "todo", "in_progress", "done"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", fontSize: "13px", fontWeight: filter === f ? 600 : 400, color: filter === f ? "var(--accent)" : "var(--text-secondary)", background: filter === f ? "var(--accent-muted)" : "transparent", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
              {f === "all" ? "All" : f === "todo" ? "To Do" : f === "in_progress" ? "In Progress" : "Done"}
            </button>
          ))}
        </div>
      </div>

      {renderSection("Overdue", overdue, "var(--danger)")}
      {renderSection("Today", today, "var(--warning)")}
      {renderSection("Upcoming", upcoming)}
      {renderSection("No Due Date", noDue)}
      {renderSection("Completed", done, "var(--success)")}

      {tasks.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-tertiary)" }}>
          <CheckCircle2 size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
          <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "8px" }}>No tasks assigned to you</div>
          <div style={{ fontSize: "14px" }}>Tasks assigned to you will appear here</div>
        </div>
      )}

      {selectedTaskId && <TaskDetailPanel taskId={selectedTaskId} onClose={() => { setSelectedTaskId(null); fetchTasks(); }} />}
    </div>
  );
}
