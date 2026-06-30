"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/task-meta";
import type { PublicUser, TagDTO, MilestoneDTO, Priority } from "@/types";

export interface TaskFilters {
  search: string;
  assignee: string; // "all" | userId | "unassigned"
  priority: string; // "all" | Priority
  tag: string; // "all" | tagId
  milestone: string; // "all" | milestoneId
  hideCompleted: boolean;
}

export const DEFAULT_FILTERS: TaskFilters = {
  search: "",
  assignee: "all",
  priority: "all",
  tag: "all",
  milestone: "all",
  hideCompleted: false,
};

export function filtersActive(f: TaskFilters) {
  return (
    !!f.search ||
    f.assignee !== "all" ||
    f.priority !== "all" ||
    f.tag !== "all" ||
    f.milestone !== "all" ||
    f.hideCompleted
  );
}

export function FilterBar({
  filters,
  onChange,
  members,
  tags,
  milestones,
}: {
  filters: TaskFilters;
  onChange: (f: TaskFilters) => void;
  members: PublicUser[];
  tags: TagDTO[];
  milestones: MilestoneDTO[];
}) {
  const set = (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch });
  const active = filtersActive(filters);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 sm:px-6">
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search tasks…"
          className="h-8 w-40 rounded-md border border-border bg-elevated pl-8 pr-2.5 text-[12px] outline-none transition-colors focus:border-accent sm:w-52"
        />
      </div>

      <div className="w-40">
        <Select
          value={filters.assignee}
          active={filters.assignee !== "all"}
          onChange={(v) => set({ assignee: v })}
          options={[
            { value: "all", label: "Assignee: All" },
            { value: "unassigned", label: "Unassigned" },
            ...members.map((m) => ({
              value: m.id,
              label: m.name,
              leading: <Avatar name={m.name} src={m.avatar} size="xs" />,
            })),
          ]}
        />
      </div>

      <div className="w-36">
        <Select
          value={filters.priority}
          active={filters.priority !== "all"}
          onChange={(v) => set({ priority: v })}
          options={[
            { value: "all", label: "Priority: All" },
            ...PRIORITY_ORDER.map((p) => ({
              value: p,
              label: PRIORITY_META[p as Priority].label,
              leading: (
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_META[p as Priority].color }} />
              ),
            })),
          ]}
        />
      </div>

      {tags.length > 0 && (
        <div className="w-36">
          <Select
            value={filters.tag}
            active={filters.tag !== "all"}
            onChange={(v) => set({ tag: v })}
            options={[
              { value: "all", label: "Tag: All" },
              ...tags.map((t) => ({
                value: t.id,
                label: t.name,
                leading: <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />,
              })),
            ]}
          />
        </div>
      )}

      {milestones.length > 0 && (
        <div className="w-40">
          <Select
            value={filters.milestone}
            active={filters.milestone !== "all"}
            onChange={(v) => set({ milestone: v })}
            options={[
              { value: "all", label: "Milestone: All" },
              ...milestones.map((m) => ({
                value: m.id,
                label: m.name,
                leading: <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.color }} />,
              })),
            ]}
          />
        </div>
      )}

      <button
        onClick={() => set({ hideCompleted: !filters.hideCompleted })}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors",
          filters.hideCompleted
            ? "border-accent bg-accent-soft text-accent"
            : "border-border text-muted hover:bg-surface hover:text-text"
        )}
      >
        <SlidersHorizontal size={13} /> Hide completed
      </button>

      {active && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-faint hover:text-danger"
        >
          <X size={13} /> Clear
        </button>
      )}
    </div>
  );
}
