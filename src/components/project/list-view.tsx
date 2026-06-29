"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Check, MessageSquare, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { PriorityDot, DueDate } from "@/components/board/task-card";
import { QuickAdd } from "@/components/board/quick-add";
import type { SectionDTO, TaskCardDTO } from "@/types";

export function ListView({
  sections,
  onTaskClick,
  onToggleComplete,
  onQuickAdd,
  canEdit,
}: {
  sections: SectionDTO[];
  onTaskClick: (taskId: string) => void;
  onToggleComplete: (task: TaskCardDTO) => void;
  onQuickAdd: (sectionId: string, title: string) => void;
  canEdit: boolean;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-4">
        {sections.map((section) => (
          <SectionGroup
            key={section.id}
            section={section}
            onTaskClick={onTaskClick}
            onToggleComplete={onToggleComplete}
            onQuickAdd={onQuickAdd}
            canEdit={canEdit}
          />
        ))}
      </div>
    </div>
  );
}

function SectionGroup({
  section,
  onTaskClick,
  onToggleComplete,
  onQuickAdd,
  canEdit,
}: {
  section: SectionDTO;
  onTaskClick: (taskId: string) => void;
  onToggleComplete: (task: TaskCardDTO) => void;
  onQuickAdd: (sectionId: string, title: string) => void;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="mb-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 py-1.5 text-[13px] font-semibold"
      >
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        {section.name}
        <span className="text-faint">{section.tasks.length}</span>
      </button>

      {open && (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-border bg-elevated">
          {section.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
              onToggle={() => onToggleComplete(task)}
            />
          ))}
          {section.tasks.length === 0 && (
            <p className="px-3 py-2.5 text-[12px] text-faint">No tasks</p>
          )}
          {canEdit && (
            <div className="border-t border-border px-1.5 py-1">
              <QuickAdd onAdd={(title) => onQuickAdd(section.id, title)} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TaskRow({
  task,
  onClick,
  onToggle,
}: {
  task: TaskCardDTO;
  onClick: () => void;
  onToggle: () => void;
}) {
  const done = !!task.completedAt;
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2.5 border-b border-border/60 px-4 py-2.5 transition-colors last:border-b-0 hover:bg-surface"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border transition-colors",
          done ? "border-success bg-success text-white" : "border-faint hover:border-text"
        )}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      >
        {done && <Check size={10} />}
      </button>
      <PriorityDot priority={task.priority} />
      <span className={cn("flex-1 truncate text-[13px]", done && "text-faint line-through")}>
        {task.title}
      </span>
      {task._count.subtasks > 0 && (
        <span className="flex items-center gap-0.5 text-[11px] text-faint">
          <GitBranch size={11} /> {task._count.subtasks}
        </span>
      )}
      {task._count.comments > 0 && (
        <span className="flex items-center gap-0.5 text-[11px] text-faint">
          <MessageSquare size={11} /> {task._count.comments}
        </span>
      )}
      <DueDate date={task.dueDate} done={done} />
      {task.assignee && (
        <Avatar name={task.assignee.name} src={task.assignee.avatar} size="xs" />
      )}
    </div>
  );
}
