"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
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
import {
  ChevronDown,
  ChevronRight,
  Check,
  Plus,
  Tag as TagIcon,
  Flag,
  Lock,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { PriorityDot } from "@/components/board/task-card";
import { QuickAdd } from "@/components/board/quick-add";
import { useRunningTimer } from "@/lib/timer";
import type {
  SectionDTO,
  TaskCardDTO,
  MilestoneDTO,
  TagDTO,
  PublicUser,
} from "@/types";

const GRID =
  "grid grid-cols-[minmax(220px,1.7fr)_150px_120px_120px_150px_140px_180px_110px_100px] items-center";

function hm(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (!h && !m) return "—";
  return `${h ? `${h}h ` : ""}${m ? `${m}m` : h ? "" : "0m"}`.trim();
}
function estLabel(min: number | null) {
  if (!min) return "—";
  return hm(min * 60);
}

export function PmsListView({
  sections,
  milestones,
  tags,
  members,
  canEdit,
  dragEnabled = false,
  onTaskClick,
  onToggleComplete,
  onQuickAdd,
  onUpdate,
  onCreateTag,
  onSectionsChange,
  onPersistOrder,
}: {
  sections: SectionDTO[];
  milestones: MilestoneDTO[];
  tags: TagDTO[];
  members: PublicUser[];
  canEdit: boolean;
  dragEnabled?: boolean;
  onTaskClick: (id: string) => void;
  onToggleComplete: (task: TaskCardDTO) => void;
  onQuickAdd: (sectionId: string, title: string) => void;
  onUpdate: (taskId: string, patch: Record<string, unknown>) => void;
  onCreateTag: (name: string) => Promise<TagDTO | null>;
  onSectionsChange?: (next: SectionDTO[]) => void;
  onPersistOrder?: (sectionId: string, taskIds: string[]) => void;
}) {
  const [edit, setEdit] = useState<string | null>(null); // `${taskId}:${field}`
  const tagById = new Map(tags.map((t) => [t.id, t]));
  const msById = new Map(milestones.map((m) => [m.id, m]));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const findSection = (id: string): SectionDTO | undefined => {
    if (sections.some((s) => s.id === id)) return sections.find((s) => s.id === id);
    return sections.find((s) => s.tasks.some((t) => t.id === id));
  };

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
    onSectionsChange?.(next);
  }

  function handleDragEnd(e: DragEndEvent) {
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
      onSectionsChange?.(
        sections.map((s) => (s.id === section.id ? { ...s, tasks: finalTasks } : s))
      );
    }
    onPersistOrder?.(section.id, finalTasks.map((t) => t.id));
  }

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[1180px]">
        {/* Header */}
        <div
          className={cn(
            GRID,
            "sticky top-0 z-10 border-b border-border bg-bg px-4 text-[11px] font-semibold uppercase tracking-wide text-faint"
          )}
        >
          <div className="py-2.5">Task name</div>
          <Col>Assignee</Col>
          <Col>Due date</Col>
          <Col>Type</Col>
          <Col>Milestone</Col>
          <Col>Status</Col>
          <Col>Tags</Col>
          <Col>Estimation</Col>
          <Col>Work logs</Col>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {sections.map((section) => (
            <SectionGroup
              key={section.id}
              section={section}
              sections={sections}
              milestones={milestones}
              tags={tags}
              tagById={tagById}
              msById={msById}
              members={members}
              canEdit={canEdit}
              dragEnabled={dragEnabled}
              edit={edit}
              setEdit={setEdit}
              onTaskClick={onTaskClick}
              onToggleComplete={onToggleComplete}
              onQuickAdd={onQuickAdd}
              onUpdate={onUpdate}
              onCreateTag={onCreateTag}
            />
          ))}
        </DndContext>
      </div>
    </div>
  );
}

function Col({ children }: { children: React.ReactNode }) {
  return <div className="border-l border-border/50 px-3 py-2.5">{children}</div>;
}

function SectionGroup(props: {
  section: SectionDTO;
  sections: SectionDTO[];
  milestones: MilestoneDTO[];
  tags: TagDTO[];
  tagById: Map<string, TagDTO>;
  msById: Map<string, MilestoneDTO>;
  members: PublicUser[];
  canEdit: boolean;
  dragEnabled: boolean;
  edit: string | null;
  setEdit: (v: string | null) => void;
  onTaskClick: (id: string) => void;
  onToggleComplete: (task: TaskCardDTO) => void;
  onQuickAdd: (sectionId: string, title: string) => void;
  onUpdate: (taskId: string, patch: Record<string, unknown>) => void;
  onCreateTag: (name: string) => Promise<TagDTO | null>;
}) {
  const { section, dragEnabled } = props;
  const [open, setOpen] = useState(true);
  const { setNodeRef, isOver } = useDroppable({ id: section.id });

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 border-b border-border bg-surface/40 px-4 py-2 text-[13px] font-semibold"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {section.name}
        <span className="text-faint">{section.tasks.length}</span>
      </button>

      {open && (
        <div ref={setNodeRef} className={cn("transition-colors", isOver && "bg-accent-soft/30")}>
          <SortableContext
            items={section.tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {section.tasks.map((task) => (
              <Row key={task.id} task={task} {...props} />
            ))}
          </SortableContext>
          {section.tasks.length === 0 && (
            <div className="border-b border-border/60 px-4 py-4 text-center text-[12px] text-faint">
              {dragEnabled ? "Drop tasks here" : "No tasks"}
            </div>
          )}
          {props.canEdit && (
            <div className="border-b border-border px-4 py-1">
              <QuickAdd onAdd={(title) => props.onQuickAdd(section.id, title)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  task,
  sections,
  milestones,
  tags,
  tagById,
  msById,
  members,
  canEdit,
  dragEnabled,
  edit,
  setEdit,
  onTaskClick,
  onToggleComplete,
  onUpdate,
  onCreateTag,
}: {
  task: TaskCardDTO;
  sections: SectionDTO[];
  milestones: MilestoneDTO[];
  tags: TagDTO[];
  tagById: Map<string, TagDTO>;
  msById: Map<string, MilestoneDTO>;
  members: PublicUser[];
  canEdit: boolean;
  dragEnabled: boolean;
  edit: string | null;
  setEdit: (v: string | null) => void;
  onTaskClick: (id: string) => void;
  onToggleComplete: (task: TaskCardDTO) => void;
  onUpdate: (taskId: string, patch: Record<string, unknown>) => void;
  onCreateTag: (name: string) => Promise<TagDTO | null>;
}) {
  const done = !!task.completedAt;
  const statusLocked = useRunningTimer()?.taskId === task.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: !dragEnabled });
  const key = (f: string) => `${task.id}:${f}`;
  const editing = (f: string) => edit === key(f);
  const startEdit = (f: string) => canEdit && setEdit(key(f));
  const stop = () => setEdit(null);
  const set = (patch: Record<string, unknown>) => {
    onUpdate(task.id, patch);
    stop();
  };

  const taskTags = task.tagIds.map((id) => tagById.get(id)).filter(Boolean) as TagDTO[];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        GRID,
        "group border-b border-border/60 px-4 hover:bg-surface/40",
        isDragging && "bg-surface opacity-60"
      )}
    >
      {/* Name */}
      <div className="flex items-center gap-1 py-2 pr-2">
        {dragEnabled && (
          <span
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className={cn(
              "flex w-4 shrink-0 touch-none items-center justify-center text-faint opacity-0 transition-opacity group-hover:opacity-100",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            <GripVertical size={14} />
          </span>
        )}
        <button
          onClick={() => onToggleComplete(task)}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            done ? "border-success bg-success text-white" : "border-faint hover:border-text"
          )}
        >
          {done && <Check size={9} />}
        </button>
        <PriorityDot priority={task.priority} />
        <button
          onClick={() => onTaskClick(task.id)}
          className={cn("truncate text-left text-[13px]", done && "text-faint line-through")}
        >
          {task.title}
        </button>
      </div>

      {/* Assignee */}
      <Cell>
        <Select
          value={task.assignee?.id ?? ""}
          searchable
          disabled={!canEdit}
          placeholder="Unassigned"
          className="text-[12px]"
          onChange={(v) => onUpdate(task.id, { assigneeId: v || null })}
          options={[
            { value: "", label: "Unassigned" },
            ...members.map((m) => ({
              value: m.id,
              label: m.name,
              leading: <Avatar name={m.name} src={m.avatar} size="xs" />,
            })),
          ]}
        />
      </Cell>

      {/* Due */}
      <Cell>
        <DatePicker
          value={task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : null}
          disabled={!canEdit}
          placeholder="—"
          className="text-[12px]"
          onChange={(v) => onUpdate(task.id, { dueDate: v })}
        />
      </Cell>

      {/* Type */}
      <Cell>
        {editing("type") ? (
          <input
            autoFocus
            defaultValue={task.taskType ?? ""}
            onBlur={(e) => set({ taskType: e.target.value.trim() || null })}
            placeholder="Type…"
            className="h-6 w-full rounded border border-accent bg-surface px-1.5 text-[12px] outline-none"
          />
        ) : (
          <button onClick={() => startEdit("type")} className="w-full text-left">
            {task.taskType ? (
              <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted">{task.taskType}</span>
            ) : (
              <span className="text-[12px] text-faint">—</span>
            )}
          </button>
        )}
      </Cell>

      {/* Milestone */}
      <Cell>
        <Select
          value={task.milestoneId ?? ""}
          disabled={!canEdit}
          placeholder="—"
          className="text-[12px]"
          onChange={(v) => onUpdate(task.id, { milestoneId: v || null })}
          options={[
            { value: "", label: "—" },
            ...milestones.map((m) => ({
              value: m.id,
              label: m.name,
              leading: <Flag size={11} style={{ color: m.color }} />,
            })),
          ]}
        />
      </Cell>

      {/* Status (section) */}
      <Cell>
        {statusLocked ? (
          <span
            className="flex w-fit items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted"
            title="Status is locked while the timer is running"
          >
            {sections.find((s) => s.id === task.sectionId)?.name ?? "—"}
            <Lock size={9} className="text-faint" />
          </span>
        ) : (
          <Select
            value={task.sectionId}
            disabled={!canEdit}
            className="text-[12px]"
            onChange={(v) => onUpdate(task.id, { sectionId: v })}
            options={sections.map((s) => ({ value: s.id, label: s.name }))}
          />
        )}
      </Cell>

      {/* Tags */}
      <Cell>
        <TagsCell
          taskTags={taskTags}
          allTags={tags}
          canEdit={canEdit}
          onToggle={(tagId, on) =>
            onUpdate(task.id, {
              tagIds: on ? [...task.tagIds, tagId] : task.tagIds.filter((t) => t !== tagId),
            })
          }
          onCreate={async (name) => {
            const t = await onCreateTag(name);
            if (t) onUpdate(task.id, { tagIds: [...task.tagIds, t.id] });
          }}
        />
      </Cell>

      {/* Estimation */}
      <Cell>
        {editing("est") ? (
          <input
            type="number"
            autoFocus
            min={0}
            step={0.5}
            defaultValue={task.estimateMinutes ? task.estimateMinutes / 60 : ""}
            onBlur={(e) =>
              set({ estimateMinutes: e.target.value ? Math.round(parseFloat(e.target.value) * 60) : null })
            }
            placeholder="h"
            className="h-6 w-full rounded border border-accent bg-surface px-1 text-[12px] outline-none"
          />
        ) : (
          <button onClick={() => startEdit("est")} className="w-full text-left text-[12px]">
            {task.estimateMinutes ? estLabel(task.estimateMinutes) : <span className="text-faint">—</span>}
          </button>
        )}
      </Cell>

      {/* Work logs (read-only) */}
      <Cell>
        <span className="text-[12px] text-muted">{hm(task.worklogSeconds ?? 0)}</span>
      </Cell>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 border-l border-border/50 px-3 py-1.5">{children}</div>;
}


function TagsCell({
  taskTags,
  allTags,
  canEdit,
  onToggle,
  onCreate,
}: {
  taskTags: TagDTO[];
  allTags: TagDTO[];
  canEdit: boolean;
  onToggle: (tagId: string, on: boolean) => void;
  onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const taskTagIds = new Set(taskTags.map((t) => t.id));
  const filtered = allTags.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  const canCreate = q.trim() && !allTags.some((t) => t.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {taskTags.slice(0, 2).map((t) => (
          <span
            key={t.id}
            className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: `${t.color}22`, color: t.color }}
          >
            {t.name}
          </span>
        ))}
        {taskTags.length > 2 && <span className="text-[10px] text-faint">+{taskTags.length - 2}</span>}
        {taskTags.length === 0 && <span className="text-[12px] text-faint">—</span>}
      </div>
      {canEdit && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-faint hover:bg-surface hover:text-text"
        >
          <Plus size={13} />
        </button>
      )}

      {open && (
        <div className="animate-slide-up absolute right-0 top-7 z-30 w-52 rounded-md border border-border bg-overlay p-1.5 shadow-popover">
          <div className="mb-1 flex items-center gap-1.5 rounded border border-border bg-surface px-1.5">
            <TagIcon size={12} className="text-faint" />
            <input
              value={q}
              autoFocus
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search or create…"
              className="h-6 flex-1 bg-transparent text-[12px] outline-none"
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.map((t) => {
              const on = taskTagIds.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => onToggle(t.id, !on)}
                  className="flex w-full items-center justify-between rounded px-1.5 py-1 text-left hover:bg-surface"
                >
                  <span
                    className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                    style={{ background: `${t.color}22`, color: t.color }}
                  >
                    {t.name}
                  </span>
                  {on && <Check size={13} className="text-accent" />}
                </button>
              );
            })}
            {canCreate && (
              <button
                onClick={() => {
                  onCreate(q.trim());
                  setQ("");
                }}
                className="flex w-full items-center gap-1.5 rounded px-1.5 py-1.5 text-left text-[12px] text-accent hover:bg-surface"
              >
                <Plus size={13} /> Create “{q.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
