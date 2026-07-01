"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  parseISO,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  min,
  max,
  className,
}: {
  value: string | null; // "yyyy-MM-dd"
  onChange: (v: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: string | null; // earliest selectable "yyyy-MM-dd"
  max?: string | null; // latest selectable "yyyy-MM-dd"
  className?: string;
}) {
  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : null;
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()));
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 250;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    let top = r.bottom + 4;
    if (top + 320 > window.innerHeight) top = Math.max(8, r.top - 324);
    setCoords({ top, left });
  }
  function toggle() {
    if (disabled) return;
    if (!open) {
      place();
      setMonth(startOfMonth(selected ?? new Date()));
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
  const today = new Date();

  function pick(v: string | null) {
    if (v !== value) onChange(v);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "flex h-8 w-full items-center gap-1.5 rounded-md border px-2 text-[13px] transition-colors",
          open ? "border-accent bg-surface" : "border-transparent",
          !disabled && !open && "hover:border-border hover:bg-surface",
          disabled && "cursor-default opacity-70",
          className
        )}
      >
        <CalendarDays size={14} className="shrink-0 text-faint" />
        {selected ? (
          <span className="truncate">{format(selected, "MMM d, yyyy")}</span>
        ) : (
          <span className="text-faint">{placeholder}</span>
        )}
        {selected && !disabled && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              if (value !== null) onChange(null);
            }}
            className="ml-auto flex h-4 w-4 items-center justify-center rounded text-faint hover:text-danger"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: 250, zIndex: 70 }}
            className="animate-slide-up rounded-md border border-border bg-overlay p-2 shadow-popover"
          >
            <div className="mb-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMonth((m) => addMonths(m, -1))}
                className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface hover:text-text"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[13px] font-semibold">{format(month, "MMMM yyyy")}</span>
              <button
                type="button"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface hover:text-text"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <div className="grid grid-cols-7">
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="flex h-6 items-center justify-center text-[10px] font-medium text-faint">
                  {d}
                </span>
              ))}
              {days.map((day) => {
                const inMonth = isSameMonth(day, month);
                const isSel = selected && isSameDay(day, selected);
                const isToday = isSameDay(day, today);
                const outOfRange =
                  (!!minDate && day < minDate && !isSameDay(day, minDate)) ||
                  (!!maxDate && day > maxDate && !isSameDay(day, maxDate));
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={outOfRange}
                    onClick={() => !outOfRange && pick(format(day, "yyyy-MM-dd"))}
                    className={cn(
                      "flex h-8 items-center justify-center rounded text-[12px] transition-colors",
                      outOfRange
                        ? "cursor-not-allowed text-faint/40"
                        : isSel
                          ? "bg-accent font-semibold text-white"
                          : inMonth
                            ? "text-text hover:bg-surface"
                            : "text-faint hover:bg-surface",
                      !outOfRange && !isSel && isToday && "font-semibold text-accent"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5">
              {(!minDate || today >= minDate || isSameDay(today, minDate)) &&
              (!maxDate || today <= maxDate || isSameDay(today, maxDate)) ? (
                <button
                  type="button"
                  onClick={() => pick(format(new Date(), "yyyy-MM-dd"))}
                  className="rounded px-2 py-1 text-[12px] font-medium text-accent hover:bg-surface"
                >
                  Today
                </button>
              ) : (
                <span />
              )}
              {selected && (
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className="rounded px-2 py-1 text-[12px] text-faint hover:text-danger"
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
