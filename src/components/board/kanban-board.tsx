"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";
import { QuickAdd } from "./quick-add";
import { useRunningTimer } from "@/lib/timer";
import type { SectionDTO, TaskCardDTO, TagDTO, MilestoneDTO } from "@/types";

interface Props {
  sections: SectionDTO[];
  tags?: TagDTO[];
  milestones?: MilestoneDTO[];
  onSectionsChange: (next: SectionDTO[]) => void;
  onPersistOrder: (sectionId: string, taskIds: string[]) => void;
  onTaskClick: (taskId: string) => void;
  onToggleComplete: (task: TaskCardDTO) => void;
  onQuickAdd: (sectionId: string, title: string) => void;
  onAddSection: () => void;
  canEdit: boolean;
}

// Whole column is a drop target so tasks can be dropped into empty sections too.
function ColumnBody({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2 transition-colors",
        isOver && "bg-accent-soft/50"
      )}
    >
      {children}
    </div>
  );
}

function SortableTaskCard({
  task,
  onClick,
  onToggle,
  disabled,
  tags,
  milestone,
}: {
  task: TaskCardDTO;
  onClick: () => void;
  onToggle: () => void;
  disabled: boolean;
  tags?: { id: string; name: string; color: string }[];
  milestone?: { name: string; color: string } | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={onClick} onToggle={onToggle} dragging={isDragging} tags={tags} milestone={milestone} />
    </div>
  );
}

export function KanbanBoard({
  sections,
  tags = [],
  milestones = [],
  onSectionsChange,
  onPersistOrder,
  onTaskClick,
  onToggleComplete,
  onQuickAdd,
  onAddSection,
  canEdit,
}: Props) {
  const [activeTask, setActiveTask] = useState<TaskCardDTO | null>(null);
  const runningTaskId = useRunningTimer()?.taskId ?? null;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const tagById = new Map(tags.map((t) => [t.id, t]));
  const msById = new Map(milestones.map((m) => [m.id, m]));
  const resolveTags = (ids: string[]) =>
    ids.map((id) => tagById.get(id)).filter(Boolean) as TagDTO[];
  const resolveMs = (id: string | null) => (id ? msById.get(id) ?? null : null);

  const findSection = (id: string): SectionDTO | undefined => {
    if (sections.some((s) => s.id === id)) return sections.find((s) => s.id === id);
    return sections.find((s) => s.tasks.some((t) => t.id === id));
  };

  function handleDragStart(e: DragStartEvent) {
    const id = e.active.id as string;
    for (const s of sections) {
      const t = s.tasks.find((t) => t.id === id);
      if (t) return setActiveTask(t);
    }
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const from = findSection(activeId);
    const to = findSection(overId);
    if (!from || !to || from.id === to.id) return;

    const next = sections.map((s) => ({ ...s, tasks: [...s.tasks] }));
    const fromS = next.find((s) => s.id === from.id)!;
    const toS = next.find((s) => s.id === to.id)!;
    const idx = fromS.tasks.findIndex((t) => t.id === activeId);
    if (idx === -1) return;
    const [moved] = fromS.tasks.splice(idx, 1);
    moved.sectionId = toS.id;

    const overIdx = toS.tasks.findIndex((t) => t.id === overId);
    if (overIdx === -1) toS.tasks.push(moved);
    else toS.tasks.splice(overIdx, 0, moved);

    onSectionsChange(next);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const section = findSection(activeId);
    if (!section) return;

    let finalTasks = section.tasks;
    const oldIdx = section.tasks.findIndex((t) => t.id === activeId);
    const newIdx = section.tasks.findIndex((t) => t.id === overId);
    if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
      finalTasks = arrayMove(section.tasks, oldIdx, newIdx);
      onSectionsChange(
        sections.map((s) => (s.id === section.id ? { ...s, tasks: finalTasks } : s))
      );
    }
    onPersistOrder(
      section.id,
      finalTasks.map((t) => t.id)
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto px-6 py-4">
        {sections.map((section) => (
          <div
            key={section.id}
            className="flex max-h-full w-[300px] shrink-0 flex-col rounded-xl border border-border bg-elevated/50"
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold">{section.name}</span>
                <span className="text-[12px] text-faint">{section.tasks.length}</span>
              </div>
            </div>

            <ColumnBody id={section.id}>
              <SortableContext
                items={section.tasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {section.tasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    disabled={!canEdit || task.id === runningTaskId}
                    onClick={() => onTaskClick(task.id)}
                    onToggle={() => onToggleComplete(task)}
                    tags={resolveTags(task.tagIds)}
                    milestone={resolveMs(task.milestoneId)}
                  />
                ))}
              </SortableContext>

              {section.tasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/70 py-6 text-center text-[12px] text-faint">
                  Drop tasks here
                </div>
              )}
            </ColumnBody>

            {canEdit && (
              <div className="px-2 pb-2">
                <QuickAdd onAdd={(title) => onQuickAdd(section.id, title)} />
              </div>
            )}
          </div>
        ))}

        {canEdit && (
          <button
            onClick={onAddSection}
            className="flex h-9 w-[260px] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-[13px] text-faint transition-colors hover:border-border-strong hover:text-muted"
          >
            <Plus size={15} /> Add section
          </button>
        )}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-[284px] rotate-1">
            <TaskCard
              task={activeTask}
              tags={resolveTags(activeTask.tagIds)}
              milestone={resolveMs(activeTask.milestoneId)}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
