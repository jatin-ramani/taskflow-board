"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, User, Lock, MoreHorizontal, Plus, ChevronDown, ChevronRight, Globe } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface Task {
  id: string; title: string; dueDate: string | null; status: string;
  assignee?: { name: string; avatar: string | null };
  project?: { name: string; color: string };
}

export function ProjectListView({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    recently: true, today: true, nextWeek: true, later: true
  });

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(data => {
        // Flatten tasks from columns
        const allTasks = data.columns.flatMap((c: any) => c.tasks);
        setTasks(allTasks);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const sections = [
    { id: "recently", label: "Recently assigned", tasks: tasks.slice(0, 2) },
    { id: "today", label: "Do today", tasks: [] },
    { id: "nextWeek", label: "Do next week", tasks: [] },
    { id: "later", label: "Do later", tasks: [] },
  ];

  if (loading) return <div style={{ padding: "40px", color: "var(--text-tertiary)" }}>Loading list...</div>;

  return (
    <div style={{ padding: "0 24px" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "12px 0", fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>
        <div style={{ width: "40%" }}>Name</div>
        <div style={{ width: "15%" }}>Due date</div>
        <div style={{ width: "15%" }}>Collaborators</div>
        <div style={{ width: "15%" }}>Projects</div>
        <div style={{ width: "15%" }}>Task visibility</div>
      </div>

      {sections.map((section) => (
        <div key={section.id} style={{ marginTop: "8px" }}>
          <button 
            onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 0", background: "transparent", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}
          >
            {expandedSections[section.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {section.label}
          </button>

          {expandedSections[section.id] && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {section.tasks.map((task) => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                  <div style={{ width: "40%", display: "flex", alignItems: "center", gap: "10px" }}>
                    <CheckCircle2 size={16} color="var(--text-tertiary)" />
                    <span>{task.title}</span>
                  </div>
                  <div style={{ width: "15%", color: "var(--text-tertiary)" }}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </div>
                  <div style={{ width: "15%" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600, color: "#fff" }}>
                      {task.assignee ? getInitials(task.assignee.name) : <User size={12} />}
                    </div>
                  </div>
                  <div style={{ width: "15%" }}>
                    <span style={{ fontSize: "11px", padding: "2px 8px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}>
                      {task.project?.name || "No project"}
                    </span>
                  </div>
                  <div style={{ width: "15%", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-tertiary)" }}>
                    <Lock size={12} />
                    <span>Only me</span>
                  </div>
                </div>
              ))}
              <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 24px", color: "var(--text-tertiary)", fontSize: "13px", background: "transparent", border: "none", cursor: "pointer" }}>
                <Plus size={14} /> Add task...
              </button>
            </div>
          )}
        </div>
      ))}
      
      <button style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", padding: "8px 0", color: "var(--text-tertiary)", fontSize: "14px", fontWeight: 500, background: "transparent", border: "none", cursor: "pointer" }}>
        <Plus size={16} /> Add section
      </button>
    </div>
  );
}
