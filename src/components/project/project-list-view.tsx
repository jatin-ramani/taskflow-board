"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, Circle, User, Lock, MoreHorizontal, Plus, ChevronDown, ChevronRight, Trash2, CheckSquare, X, Loader2, GripVertical, PlayCircle } from "lucide-react";
import { getInitials, cn } from "@/lib/utils";
import { useToast } from "@/components/layout/toast-provider";
import { TooltipSimple } from "@/components/ui/tooltip";
import { DndContext, closestCorners, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

interface Task {
  id: string; title: string; dueDate: string | null; status: string; isFavorite: boolean;
  assignee?: { name: string; avatar: string | null };
  project?: { name: string; color: string };
}

interface ProjectListViewProps { 
  projectId: string; 
  onTaskClick: (taskId: string) => void;
  filterStatus?: string;
  filterFavorite?: boolean;
  refreshKey?: number;
}

function SortableTaskRow({ task, selected, onSelect, onClick }: { task: Task, selected: boolean, onSelect: (e: any) => void, onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: "task", status: task.status } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as "relative",
    background: selected ? "var(--bg-secondary)" : "transparent",
    display: "flex",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid var(--border)",
    fontSize: "13px",
    cursor: "pointer",
  };

  const getStatusIcon = () => {
    if (task.status === "DONE") return <CheckCircle2 size={16} color="var(--success)" />;
    if (task.status === "IN_PROGRESS") return <PlayCircle size={16} color="var(--accent)" />;
    return <Circle size={16} color="var(--text-tertiary)" />;
  };

  return (
    <div ref={setNodeRef} style={style} onClick={onClick}>
      <div style={{ width: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab" }} {...attributes} {...listeners}>
        <GripVertical size={14} color="var(--text-tertiary)" />
      </div>
      <div style={{ width: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TooltipSimple label={selected ? "Deselect" : "Select"}>
          <button onClick={onSelect} style={{ background: "none", border: "none", cursor: "pointer", color: selected ? "var(--accent)" : "var(--text-tertiary)" }}>
            <CheckSquare size={16} fill={selected ? "currentColor" : "none"} />
          </button>
        </TooltipSimple>
      </div>
      <div style={{ width: "40%", display: "flex", alignItems: "center", gap: "10px" }}>
        {getStatusIcon()}
        <span style={{ textDecoration: task.status === "DONE" ? "line-through" : "none", color: task.status === "DONE" ? "var(--text-tertiary)" : "inherit" }}>{task.title}</span>
      </div>
      <div style={{ width: "15%", color: "var(--text-tertiary)" }}>
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
      </div>
      <div style={{ width: "15%" }}>
        <TooltipSimple label={task.assignee?.name || "Unassigned"}>
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: task.assignee?.avatar ? `url(${task.assignee.avatar}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600, color: "#fff" }}>
            {!task.assignee?.avatar && (task.assignee ? getInitials(task.assignee.name) : <User size={12} />)}
          </div>
        </TooltipSimple>
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
  );
}

function StatusSection({ status, label, tasks, expanded, onToggle, onTaskClick, selectedIds, onSelectTask }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: "section", status } });

  return (
    <div ref={setNodeRef} style={{ marginTop: "16px", borderRadius: "var(--radius-md)", background: isOver ? "var(--bg-tertiary)" : "transparent", transition: "var(--transition-fast)" }}>
      <button 
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 0", background: "transparent", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label} <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 400 }}>{tasks.length}</span>
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "20px" }}>
          <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task: any) => (
              <SortableTaskRow 
                key={task.id} 
                task={task} 
                selected={selectedIds.includes(task.id)} 
                onSelect={(e: any) => onSelectTask(e, task.id)} 
                onClick={() => onTaskClick(task.id)} 
              />
            ))}
          </SortableContext>
          {tasks.length === 0 && (
            <div style={{ padding: "12px 70px", fontSize: "13px", color: "var(--text-tertiary)", fontStyle: "italic" }}>No tasks here. Drop a task to move to {label}.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectListView({ projectId, onTaskClick, filterStatus, filterFavorite, refreshKey }: ProjectListViewProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    TODO: true, IN_PROGRESS: true, DONE: true, favorites: true
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchTasks = async () => {
    try {
      const r = await fetch(`/api/projects/${projectId}`);
      if (r.ok) {
        const data = await r.json();
        const allTasks = data.columns.flatMap((c: any) => c.tasks);
        setTasks(allTasks);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, [projectId, refreshKey]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we dropped over a status section
    const targetStatus = over.data.current?.type === "section" ? overId : tasks.find(t => t.id === overId)?.status;

    if (targetStatus && targetStatus !== tasks.find(t => t.id === activeId)?.status) {
      // Change Status
      setTasks(prev => prev.map(t => t.id === activeId ? { ...t, status: targetStatus } : t));
      try {
        await fetch(`/api/tasks/${activeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetStatus })
        });
        toast(`Task moved to ${targetStatus.replace("_", " ")}`, "success");
      } catch {}
    } else if (activeId !== overId) {
      // Reorder within same status
      const oldIndex = tasks.findIndex((t) => t.id === activeId);
      const newIndex = tasks.findIndex((t) => t.id === overId);
      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);
      try {
        await fetch(`/api/tasks/${activeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: newIndex })
        });
      } catch {}
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkUpdate = async (updates: any) => {
    if (selectedIds.length === 0) return;
    setIsBulkActionLoading(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, updates })
      });
      if (res.ok) {
        toast(`Successfully updated ${selectedIds.length} tasks`, "success");
        setSelectedIds([]);
        fetchTasks();
      }
    } catch {
      toast("Bulk update failed", "error");
    } finally { setIsBulkActionLoading(false); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} tasks?`)) return;
    setIsBulkActionLoading(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        toast(`Successfully deleted ${selectedIds.length} tasks`, "success");
        setSelectedIds([]);
        fetchTasks();
      }
    } catch {
      toast("Bulk delete failed", "error");
    } finally { setIsBulkActionLoading(false); }
  };

  const todoTasks = useMemo(() => tasks.filter(t => t.status === "TODO"), [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter(t => t.status === "IN_PROGRESS"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(t => t.status === "DONE"), [tasks]);
  const favoriteTasks = useMemo(() => tasks.filter(t => t.isFavorite), [tasks]);

  if (loading) return <div style={{ padding: "40px", color: "var(--text-tertiary)" }}>Loading list...</div>;

  return (
    <div style={{ padding: "0 24px", position: "relative", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "12px 0", fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 500 }}>
        <div style={{ width: "30px" }}></div>
        <div style={{ width: "40px" }}></div>
        <div style={{ width: "40%" }}>Name</div>
        <div style={{ width: "15%" }}>Due date</div>
        <div style={{ width: "15%" }}>Collaborators</div>
        <div style={{ width: "15%" }}>Projects</div>
        <div style={{ width: "15%" }}>Task visibility</div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        {filterFavorite ? (
          <StatusSection status="favorites" label="Favorite tasks" tasks={favoriteTasks} expanded={expandedSections.favorites} onToggle={() => setExpandedSections(p => ({ ...p, favorites: !p.favorites }))} onTaskClick={onTaskClick} selectedIds={selectedIds} onSelectTask={toggleSelect} />
        ) : filterStatus === "DONE" ? (
          <StatusSection status="DONE" label="Completed tasks" tasks={doneTasks} expanded={expandedSections.DONE} onToggle={() => setExpandedSections(p => ({ ...p, DONE: !p.DONE }))} onTaskClick={onTaskClick} selectedIds={selectedIds} onSelectTask={toggleSelect} />
        ) : (
          <>
            <StatusSection status="TODO" label="To do" tasks={todoTasks} expanded={expandedSections.TODO} onToggle={() => setExpandedSections(p => ({ ...p, TODO: !p.TODO }))} onTaskClick={onTaskClick} selectedIds={selectedIds} onSelectTask={toggleSelect} />
            <StatusSection status="IN_PROGRESS" label="In progress" tasks={inProgressTasks} expanded={expandedSections.IN_PROGRESS} onToggle={() => setExpandedSections(p => ({ ...p, IN_PROGRESS: !p.IN_PROGRESS }))} onTaskClick={onTaskClick} selectedIds={selectedIds} onSelectTask={toggleSelect} />
            <StatusSection status="DONE" label="Done" tasks={doneTasks} expanded={expandedSections.DONE} onToggle={() => setExpandedSections(p => ({ ...p, DONE: !p.DONE }))} onTaskClick={onTaskClick} selectedIds={selectedIds} onSelectTask={toggleSelect} />
          </>
        )}
      </DndContext>
      
      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{ position: "fixed", bottom: "32px", left: "50%", transform: "translateX(-50%)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "8px 24px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "var(--shadow-xl)", zIndex: 100 }} className="animate-slide-up">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", borderRight: "1px solid var(--border)", paddingRight: "16px" }}>
            <button onClick={() => setSelectedIds([])} data-tooltip="Clear selection" style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}><X size={16} /></button>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{selectedIds.length} tasks selected</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => handleBulkUpdate({ status: "DONE" })} data-tooltip="Complete selected" style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={16} /> Mark as complete
            </button>
            <button onClick={handleBulkDelete} data-tooltip="Delete selected" style={{ background: "none", border: "none", color: "var(--danger)", fontSize: "13px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
              <Trash2 size={16} /> Delete
            </button>
          </div>
          {isBulkActionLoading && <Loader2 size={16} className="animate-spin" color="var(--accent)" />}
        </div>
      )}
    </div>
  );
}
