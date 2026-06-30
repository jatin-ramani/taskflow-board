"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  leading?: React.ReactNode;
}

export function Select({
  value,
  options,
  onChange,
  placeholder = "Select…",
  searchable = false,
  disabled = false,
  active = false,
  className,
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, 190);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setCoords({ top: r.bottom + 4, left, width });
  }

  function toggle() {
    if (disabled) return;
    if (!open) {
      place();
      setQ("");
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      )
        return;
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

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "flex h-8 w-full items-center gap-1.5 rounded-md border px-2 text-[13px] transition-colors",
          active ? "border-accent/50 bg-accent-soft text-accent" : "border-transparent",
          !disabled && !active && "hover:border-border hover:bg-surface",
          open && "border-accent bg-surface",
          disabled && "cursor-default opacity-70",
          className
        )}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {selected.leading}
            <span className="truncate">{selected.label}</span>
          </span>
        ) : (
          <span className="text-faint">{placeholder}</span>
        )}
        {!disabled && <ChevronDown size={14} className="ml-auto shrink-0 text-faint" />}
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 70 }}
            className="animate-slide-up overflow-hidden rounded-md border border-border bg-overlay p-1 shadow-popover"
          >
            {searchable && (
              <div className="mb-1 flex items-center gap-1.5 rounded border border-border bg-surface px-1.5">
                <Search size={12} className="text-faint" />
                <input
                  value={q}
                  autoFocus
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  className="h-7 flex-1 bg-transparent text-[12px] outline-none"
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto">
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface"
                >
                  {o.leading}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.value === value && <Check size={14} className="shrink-0 text-accent" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-2 py-2 text-[12px] text-faint">No matches</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
