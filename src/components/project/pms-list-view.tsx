"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Plus,
  Tag as TagIcon,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { PriorityDot } from "@/components/board/task-card";
import { QuickAdd } from "@/components/board/quick-add";
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
  onTaskClick,
  onToggleComplete,
  onQuickAdd,
  onUpdate,
  onCreateTag,
}: {
  sections: SectionDTO[];
  milestones: MilestoneDTO[];
  tags: TagDTO[];
  members: PublicUser[];
  canEdit: boolean;
  onTaskClick: (id: string) => void;
  onToggleComplete: (task: TaskCardDTO) => void;
  onQuickAdd: (sectionId: string, title: string) => void;
  onUpdate: (taskId: string, patch: Record<string, unknown>) => void;
  onCreateTag: (name: string) => Promise<TagDTO | null>;
}) {
  const [edit, setEdit] = useState<string | null>(null); // `${taskId}:${field}`
  const tagById = new Map(tags.map((t) => [t.id, t]));
  const msById = new Map(milestones.map((m) => [m.id, m]));

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
            edit={edit}
            setEdit={setEdit}
            onTaskClick={onTaskClick}
            onToggleComplete={onToggleComplete}
            onQuickAdd={onQuickAdd}
            onUpdate={onUpdate}
            onCreateTag={onCreateTag}
          />
        ))}
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
  edit: string | null;
  setEdit: (v: string | null) => void;
  onTaskClick: (id: string) => void;
  onToggleComplete: (task: TaskCardDTO) => void;
  onQuickAdd: (sectionId: string, title: string) => void;
  onUpdate: (taskId: string, patch: Record<string, unknown>) => void;
  onCreateTag: (name: string) => Promise<TagDTO | null>;
}) {
  const { section } = props;
  const [open, setOpen] = useState(true);

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
        <>
          {section.tasks.map((task) => (
            <Row key={task.id} task={task} {...props} />
          ))}
          {props.canEdit && (
            <div className="border-b border-border px-4 py-1">
              <QuickAdd onAdd={(title) => props.onQuickAdd(section.id, title)} />
            </div>
          )}
        </>
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
  edit: string | null;
  setEdit: (v: string | null) => void;
  onTaskClick: (id: string) => void;
  onToggleComplete: (task: TaskCardDTO) => void;
  onUpdate: (taskId: string, patch: Record<string, unknown>) => void;
  onCreateTag: (name: string) => Promise<TagDTO | null>;
}) {
  const done = !!task.completedAt;
  const key = (f: string) => `${task.id}:${f}`;
  const editing = (f: string) => edit === key(f);
  const startEdit = (f: string) => canEdit && setEdit(key(f));
  const stop = () => setEdit(null);
  const set = (patch: Record<string, unknown>) => {
    onUpdate(task.id, patch);
    stop();
  };

  const milestone = task.milestoneId ? msById.get(task.milestoneId) : null;
  const taskTags = task.tagIds.map((id) => tagById.get(id)).filter(Boolean) as TagDTO[];

  return (
    <div className={cn(GRID, "border-b border-border/60 px-4 hover:bg-surface/40")}>
      {/* Name */}
      <div className="flex items-center gap-2 py-2 pr-2">
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
        {editing("assignee") ? (
          <Selecter
            value={task.assignee?.id ?? ""}
            onCommit={(v) => set({ assigneeId: v || null })}
            onCancel={stop}
            options={[
              { value: "", label: "Unassigned" },
              ...members.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
        ) : (
          <button onClick={() => startEdit("assignee")} className="flex w-full items-center gap-1.5 text-left">
            {task.assignee ? (
              <>
                <Avatar name={task.assignee.name} src={task.assignee.avatar} size="xs" />
                <span className="truncate text-[12px]">{task.assignee.name}</span>
              </>
            ) : (
              <span className="text-[12px] text-faint">Unassigned</span>
            )}
          </button>
        )}
      </Cell>

      {/* Due */}
      <Cell>
        {editing("due") ? (
          <input
            type="date"
            autoFocus
            defaultValue={task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""}
            onBlur={(e) => set({ dueDate: e.target.value || null })}
            className="h-6 w-full rounded border border-accent bg-surface px-1 text-[12px] outline-none"
          />
        ) : (
          <button onClick={() => startEdit("due")} className="w-full text-left text-[12px]">
            {task.dueDate ? format(new Date(task.dueDate), "MMM d") : <span className="text-faint">—</span>}
          </button>
        )}
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
        {editing("milestone") ? (
          <Selecter
            value={task.milestoneId ?? ""}
            onCommit={(v) => set({ milestoneId: v || null })}
            onCancel={stop}
            options={[
              { value: "", label: "None" },
              ...milestones.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
        ) : (
          <button onClick={() => startEdit("milestone")} className="flex w-full items-center gap-1 text-left">
            {milestone ? (
              <span className="flex items-center gap-1 truncate text-[12px]" style={{ color: milestone.color }}>
                <Flag size={11} /> {milestone.name}
              </span>
            ) : (
              <span className="text-[12px] text-faint">—</span>
            )}
          </button>
        )}
      </Cell>

      {/* Status (section) */}
      <Cell>
        {editing("status") ? (
          <Selecter
            value={task.sectionId}
            onCommit={(v) => v && set({ sectionId: v })}
            onCancel={stop}
            options={sections.map((s) => ({ value: s.id, label: s.name }))}
          />
        ) : (
          <button onClick={() => startEdit("status")} className="w-full text-left">
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">
              {sections.find((s) => s.id === task.sectionId)?.name ?? "—"}
            </span>
          </button>
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

function Selecter({
  value,
  options,
  onCommit,
  onCancel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  return (
    <select
      autoFocus
      defaultValue={value}
      onChange={(e) => onCommit(e.target.value)}
      onBlur={onCancel}
      className="h-6 w-full rounded border border-accent bg-surface px-1 text-[12px] outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
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
