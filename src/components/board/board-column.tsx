"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./task-card";
import { useState } from "react";
import { Plus } from "lucide-react";

interface Task {
  id: string; title: string; description: string | null; priority: string; status: string;
  position: number; dueDate: string | null; totalTimeLogged: number; tags: string[];
  columnId: string; projectId: string;
  assignee: { id: string; name: string; avatar: string | null } | null;
  _count: { subtasks: number; comments: number };
}

interface BoardColumnProps {
  column: { id: string; name: string; color: string; tasks: Task[] };
  onAddTask: (columnId: string, title: string) => void;
  onTaskClick: (taskId: string) => void;
}

export function BoardColumn({ column, onAddTask, onTaskClick }: BoardColumnProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(column.id, newTaskTitle.trim());
    setNewTaskTitle("");
    setShowAddTask(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: "300px",
        maxWidth: "300px",
        background: isOver ? "rgba(255,88,74,0.05)" : "var(--bg-secondary)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        border: isOver ? "1px solid rgba(255,88,74,0.2)" : "1px solid transparent",
        transition: "var(--transition-fast)",
        flexShrink: 0,
      }}
    >
      {/* Column Header */}
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: column.color }} />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>{column.name}</span>
          <span style={{ fontSize: "12px", color: "var(--text-tertiary)", background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "var(--radius-full)", fontWeight: 500 }}>
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddTask(true)}
          style={{ width: "24px", height: "24px", borderRadius: "4px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", transition: "var(--transition-fast)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Task List */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
          ))}
        </SortableContext>

        {/* Inline Add Task */}
        {showAddTask && (
          <form onSubmit={handleSubmit} className="animate-slide-in-up">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task name..."
              autoFocus
              style={{ width: "100%", height: "36px", background: "var(--bg-primary)", border: "1px solid var(--accent)", borderRadius: "var(--radius-md)", padding: "0 12px", fontSize: "13px", color: "var(--text-primary)", outline: "none" }}
              onBlur={() => { if (!newTaskTitle.trim()) setShowAddTask(false); }}
              onKeyDown={(e) => { if (e.key === "Escape") { setShowAddTask(false); setNewTaskTitle(""); } }}
            />
          </form>
        )}
      </div>

      {/* Add Task Footer */}
      {!showAddTask && (
        <button
          onClick={() => setShowAddTask(true)}
          style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-tertiary)", fontSize: "13px", background: "transparent", border: "none", cursor: "pointer", transition: "var(--transition-fast)", borderTop: "1px solid transparent" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.borderRadius = "0 0 var(--radius-lg) var(--radius-lg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}
        >
          <Plus size={14} /> Add task
        </button>
      )}
    </div>
  );
}
