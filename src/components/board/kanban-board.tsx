"use client";

import { useState, useEffect, useCallback } from "react";
import { DndContext, closestCorners, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { BoardColumn } from "./board-column";
import { TaskCard } from "./task-card";
import { Plus, Loader2 } from "lucide-react";

interface Column { id: string; name: string; color: string; position: number; tasks: Task[]; }
interface Task {
  id: string; title: string; description: string | null; priority: string; status: string;
  position: number; dueDate: string | null; totalTimeLogged: number; tags: string[];
  columnId: string; projectId: string;
  assignee: { id: string; name: string; avatar: string | null } | null;
  _count: { subtasks: number; comments: number };
}

interface KanbanBoardProps { 
  projectId: string; 
  onTaskClick: (taskId: string) => void;
  externalTaskId?: string | null;
  refreshKey?: number;
}

export function KanbanBoard({ projectId, onTaskClick, externalTaskId, refreshKey }: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const activeCols = data.columns.map((c: any) => ({
          ...c,
          tasks: c.tasks.filter((t: any) => t.status !== "DONE")
        }));
        setColumns(activeCols || []);
      }
    } catch { } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchBoard(); }, [fetchBoard, externalTaskId, refreshKey]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTask(event.active.id as string);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCol = findColumn(activeId);
    const overCol = findColumnForOver(overId);

    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    setColumns((prev) => {
      const newCols = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
      const fromCol = newCols.find((c) => c.id === activeCol.id)!;
      const toCol = newCols.find((c) => c.id === overCol.id)!;
      const taskIdx = fromCol.tasks.findIndex((t) => t.id === activeId);
      if (taskIdx === -1) return prev;
      const [task] = fromCol.tasks.splice(taskIdx, 1);
      task.columnId = toCol.id;
      toCol.tasks.push(task);
      return newCols;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overCol = findColumnForOver(over.id as string);
    if (!overCol) return;

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: overCol.id, position: 0 }),
      });
    } catch {}
  };

  const findTask = (taskId: string): Task | null => {
    for (const col of columns) { const t = col.tasks.find((t) => t.id === taskId); if (t) return t; }
    return null;
  };

  const findColumn = (taskId: string): Column | null => {
    return columns.find((c) => c.tasks.some((t) => t.id === taskId)) || null;
  };

  const findColumnForOver = (overId: string): Column | null => {
    const col = columns.find((c) => c.id === overId);
    if (col) return col;
    return findColumn(overId);
  };

  const handleAddTask = async (columnId: string, title: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, projectId, columnId }),
      });
      if (res.ok) {
        const task = await res.json();
        setColumns((prev) => prev.map((c) => c.id === columnId ? { ...c, tasks: [...c.tasks, task] } : c));
      }
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", color: "var(--text-tertiary)", gap: "10px" }}>
        <Loader2 size={24} className="animate-spin" /> Loading board...
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div style={{ display: "flex", gap: "16px", padding: "24px", height: "calc(100vh - 60px - 48px)", overflowX: "auto", alignItems: "flex-start" }}>
          <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => (
              <BoardColumn key={column.id} column={column} onAddTask={handleAddTask} onTaskClick={onTaskClick} />
            ))}
          </SortableContext>

          {/* Add Column Button */}
          <button
            style={{ minWidth: "280px", height: "44px", background: "var(--bg-secondary)", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--text-tertiary)", fontSize: "14px", cursor: "pointer", transition: "var(--transition-fast)", flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
          >
            <Plus size={16} /> Add Column
          </button>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="drag-overlay" style={{ width: "280px" }}>
              <TaskCard task={activeTask} onClick={() => {}} isDragOverlay />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
