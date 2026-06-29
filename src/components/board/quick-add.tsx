"use client";

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";

export function QuickAdd({
  onAdd,
  placeholder = "Add task…",
}: {
  onAdd: (title: string) => void;
  placeholder?: string;
}) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);

  function submit() {
    const title = value.trim();
    if (title) onAdd(title);
    setValue("");
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-faint transition-colors hover:bg-surface hover:text-muted"
      >
        <Plus size={15} /> Add task
      </button>
    );
  }

  return (
    <textarea
      ref={ref}
      value={value}
      rows={2}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
        if (e.key === "Escape") {
          setValue("");
          setActive(false);
        }
      }}
      onBlur={() => {
        submit();
        setActive(false);
      }}
      className="w-full resize-none rounded-lg border border-accent bg-surface px-2.5 py-2 text-[13px] text-text outline-none ring-2 ring-accent-soft placeholder:text-faint"
    />
  );
}
