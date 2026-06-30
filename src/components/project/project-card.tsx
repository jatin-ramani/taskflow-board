"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Star, MoreHorizontal, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import type { ProjectSummary } from "@/types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
}

export function ProjectCard({
  project,
  onToggleFavorite,
}: {
  project: ProjectSummary;
  onToggleFavorite: (id: string, next: boolean) => void;
}) {
  const { totalCount, doneCount } = project;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 1000) / 10 : 0;
  const status =
    totalCount === 0 ? "Not started" : doneCount === totalCount ? "Completed" : "In progress";
  const statusColor =
    status === "Completed" ? "#22c55e" : status === "In progress" ? "#f5a623" : "#9aa3b2";

  return (
    <div className="group relative flex flex-col rounded-lg border border-border bg-elevated p-3.5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
          style={{ background: project.color }}
        >
          {initials(project.name)}
        </span>
        <Link
          href={`/projects/${project.id}`}
          className="min-w-0 flex-1 truncate text-[14px] font-semibold hover:text-accent"
        >
          {project.name}
        </Link>
        <button
          onClick={() => onToggleFavorite(project.id, !project.isFavorite)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-surface",
            project.isFavorite ? "text-warning" : "text-faint hover:text-text"
          )}
          aria-label="Favourite"
        >
          <Star size={15} className={project.isFavorite ? "fill-warning" : ""} />
        </button>
        <Link
          href={`/projects/${project.id}`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-text"
        >
          <MoreHorizontal size={15} />
        </Link>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="font-semibold" style={{ color: statusColor }}>{pct}%</span>
          <span className="text-faint">
            <span className="font-medium" style={{ color: statusColor }}>{doneCount}</span> / {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: statusColor }} />
          </div>
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: `${statusColor}1a`, color: statusColor }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <CalendarDays size={13} className="text-danger" />
          {project.dueDate ? (
            <>Due: <span className="text-danger">{format(new Date(project.dueDate), "d MMM, yyyy")}</span></>
          ) : (
            <span className="text-faint">No due date</span>
          )}
        </span>
        {project.manager && (
          <span className="flex items-center gap-1.5 rounded-full border border-success/40 py-0.5 pl-2 pr-0.5 text-[10px] font-semibold text-success">
            PM
            <Avatar name={project.manager.name} src={project.manager.avatar} size="xs" />
          </span>
        )}
      </div>
    </div>
  );
}
