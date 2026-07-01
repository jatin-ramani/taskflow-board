"use client";

import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_META } from "@/lib/task-meta";
import type { SectionDTO } from "@/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  sections,
  onTaskClick,
}: {
  sections: SectionDTO[];
  onTaskClick: (id: string) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const tasks = sections.flatMap((s) => s.tasks).filter((t) => t.dueDate);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
  const today = new Date();

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <h2 className="text-[15px] font-semibold">{format(month, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface hover:text-text"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="rounded-md border border-border px-2.5 py-1 text-[12px] text-muted hover:bg-surface hover:text-text"
          >
            Today
          </button>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface hover:text-text"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-y border-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid flex-1 grid-cols-7 overflow-auto"
        style={{ gridTemplateRows: `repeat(${Math.ceil(days.length / 7)}, minmax(96px, 1fr))` }}
      >
        {days.map((day) => {
          const dayTasks = tasks.filter((t) => isSameDay(new Date(t.dueDate!), day));
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[96px] border-b border-r border-border p-1",
                !inMonth && "bg-surface/30"
              )}
            >
              <div
                className={cn(
                  "mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px]",
                  isToday ? "bg-accent font-semibold text-white" : inMonth ? "text-muted" : "text-faint"
                )}
              >
                {format(day, "d")}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayTasks.slice(0, 4).map((t) => {
                  const done = !!t.completedAt;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onTaskClick(t.id)}
                      className={cn(
                        "flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-surface",
                        done && "opacity-50"
                      )}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: PRIORITY_META[t.priority].color }}
                      />
                      <span className={cn("truncate", done && "line-through")}>{t.title}</span>
                    </button>
                  );
                })}
                {dayTasks.length > 4 && (
                  <span className="px-1 text-[10px] text-faint">+{dayTasks.length - 4} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
