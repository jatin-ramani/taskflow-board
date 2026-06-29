"use client";

import { format, isPast, isToday } from "date-fns";
import { MessageSquare, GitBranch, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { PRIORITY_META } from "@/lib/task-meta";
import type { Priority, TaskCardDTO } from "@/types";

export function PriorityDot({ priority }: { priority: Priority }) {
  if (priority === "NONE") {
    return <span className="h-2.5 w-2.5 rounded-full border border-faint/60" />;
  }
  return (
    <span
      className="h-2.5 w-2.5 rounded-full"
      style={{ background: PRIORITY_META[priority].color }}
    />
  );
}

export function DueDate({
  date,
  done,
}: {
  date: string | null;
  done: boolean;
}) {
  if (!date) return null;
  const d = new Date(date);
  const overdue = !done && isPast(d) && !isToday(d);
  return (
    <span className={cn("text-[11px]", overdue ? "text-danger" : "text-faint")}>
      {format(d, "MMM d")}
    </span>
  );
}

export function TaskCard({
  task,
  onClick,
  onToggle,
  dragging,
}: {
  task: TaskCardDTO;
  onClick?: () => void;
  onToggle?: () => void;
  dragging?: boolean;
}) {
  const done = !!task.completedAt;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-lg border border-border bg-surface p-2.5 transition-colors hover:border-border-strong",
        onClick && "cursor-pointer",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className={cn(
            "mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border transition-colors",
            done
              ? "border-success bg-success text-white"
              : "border-faint hover:border-text"
          )}
          aria-label={done ? "Mark incomplete" : "Mark complete"}
        >
          {done && <Check size={10} />}
        </button>
        <p
          className={cn(
            "flex-1 text-[13px] leading-snug",
            done && "text-faint line-through"
          )}
        >
          {task.title}
        </p>
      </div>

      <div className="mt-2 flex items-center gap-2 pl-[23px]">
        <PriorityDot priority={task.priority} />
        <DueDate date={task.dueDate} done={done} />
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
        {task.assignee && (
          <span className="ml-auto">
            <Avatar name={task.assignee.name} src={task.assignee.avatar} size="xs" />
          </span>
        )}
      </div>
    </div>
  );
}
