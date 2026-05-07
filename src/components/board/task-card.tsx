"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Clock, MessageSquare, ListChecks } from "lucide-react";
import { formatDuration, getInitials } from "@/lib/utils";

interface Task {
  id: string; title: string; description: string | null; priority: string; status: string;
  position: number; dueDate: string | null; totalTimeLogged: number; tags: string[];
  columnId: string; projectId: string;
  assignee: { id: string; name: string; avatar: string | null } | null;
  _count: { subtasks: number; comments: number };
}

interface TaskCardProps { task: Task; onClick: () => void; isDragOverlay?: boolean; }

const priorityColors: Record<string, string> = {
  URGENT: "#ff5630", HIGH: "#ff8b00", MEDIUM: "#ffab00", LOW: "#36b37e", NONE: "transparent",
};

const priorityLabels: Record<string, string> = {
  URGENT: "Urgent", HIGH: "High", MEDIUM: "Med", LOW: "Low", NONE: "",
};

export function TaskCard({ task, onClick, isDragOverlay }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragOverlay ? "grabbing" : "grab",
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div
        style={{
          background: "var(--bg-primary)",
          borderRadius: "var(--radius-md)",
          padding: "12px",
          border: "1px solid var(--border)",
          cursor: "pointer",
          transition: "var(--transition-fast)",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!isDragOverlay) {
            e.currentTarget.style.borderColor = "var(--border-hover)";
            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragOverlay) {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
      >
        {/* Priority indicator */}
        {task.priority !== "NONE" && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: priorityColors[task.priority] }} />
            <span style={{ fontSize: "11px", fontWeight: 500, color: priorityColors[task.priority] }}>
              {priorityLabels[task.priority]}
            </span>
          </div>
        )}

        {/* Title */}
        <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "8px", wordBreak: "break-word" }}>
          {task.title}
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "var(--accent-muted)", color: "var(--accent-light)", fontWeight: 500 }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom Meta */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Due Date */}
            {task.dueDate && (
              <div data-tooltip="Due date" style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: isOverdue ? "var(--danger)" : "var(--text-tertiary)" }}>
                <Calendar size={11} />
                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            )}

            {/* Time Logged */}
            {task.totalTimeLogged > 0 && (
              <div data-tooltip="Focus time" style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                <Clock size={11} />
                {formatDuration(task.totalTimeLogged)}
              </div>
            )}

            {/* Subtasks */}
            {task._count.subtasks > 0 && (
              <div data-tooltip="Subtasks" style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                <ListChecks size={11} />
                {task._count.subtasks}
              </div>
            )}

            {/* Comments */}
            {task._count.comments > 0 && (
              <div data-tooltip="Comments" style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                <MessageSquare size={11} />
                {task._count.comments}
              </div>
            )}
          </div>

          {/* Assignee Avatar */}
          {task.assignee && (
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: task.assignee.avatar ? `url(${task.assignee.avatar}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600, color: "#fff" }} title={task.assignee.name}>
              {!task.assignee.avatar && getInitials(task.assignee.name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
