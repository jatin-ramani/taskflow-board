"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Hash, Users, CalendarDays, Flag, BarChart3, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { FullSpinner } from "@/components/ui/spinner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { KanbanBoard } from "@/components/board/kanban-board";
import { PmsListView } from "@/components/project/pms-list-view";
import { CalendarView } from "@/components/project/calendar-view";
import { MilestonesView } from "@/components/project/milestones-view";
import { DashboardView } from "@/components/project/dashboard-view";
import { TaskDetailPanel } from "@/components/task/task-detail-panel";
import { MembersDialog } from "@/components/project/members-dialog";
import { ProjectInfo } from "@/components/project/project-info";
import { FilterBar, DEFAULT_FILTERS, filtersActive, type TaskFilters } from "@/components/project/filter-bar";
import { useToast } from "@/components/ui/toast";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import { MobileMenuButton } from "@/components/layout/app-shell";
import type {
  ProjectDetailDTO,
  SectionDTO,
  TaskCardDTO,
  TagDTO,
  PublicUser,
} from "@/types";

type View = "board" | "list" | "calendar" | "milestones" | "dashboard" | "info";

function matchesFilters(t: TaskCardDTO, f: TaskFilters): boolean {
  if (f.hideCompleted && t.completedAt) return false;
  if (f.search && !t.title.toLowerCase().includes(f.search.toLowerCase())) return false;
  if (f.assignee === "unassigned") {
    if (t.assignee) return false;
  } else if (f.assignee !== "all" && t.assignee?.id !== f.assignee) {
    return false;
  }
  if (f.priority !== "all" && t.priority !== f.priority) return false;
  if (f.tag !== "all" && !t.tagIds.includes(f.tag)) return false;
  if (f.milestone !== "all" && t.milestoneId !== f.milestone) return false;
  return true;
}

export function ProjectView({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [project, setProject] = useState<ProjectDetailDTO | null>(null);
  const [sections, setSections] = useState<SectionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<View>("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data: ProjectDetailDTO = await res.json();
      setProject(data);
      setSections(data.sections);
    } else if (res.status === 404 || res.status === 403) {
      setNotFound(true);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const canEdit = !!project && project.role !== "VIEWER";
  const canManage = !!project && (project.role === "OWNER" || project.role === "ADMIN");
  const isOwner = !!project && project.role === "OWNER";

  const assignable = useMemo<PublicUser[]>(() => {
    if (!project) return [];
    const map = new Map<string, PublicUser>();
    map.set(project.owner.id, project.owner);
    for (const m of project.members) map.set(m.user.id, m.user);
    return [...map.values()];
  }, [project]);

  async function persistOrder(sectionId: string, taskIds: string[]) {
    await fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, taskIds }),
    });
  }

  async function reorderSections(sectionIds: string[]) {
    await fetch(`/api/projects/${projectId}/sections/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionIds }),
    });
  }

  async function toggleComplete(task: TaskCardDTO) {
    const completed = !task.completedAt;
    // optimistic
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === task.id
            ? { ...t, completedAt: completed ? new Date().toISOString() : null }
            : t
        ),
      }))
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
  }

  async function quickAdd(sectionId: string, title: string) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, projectId, sectionId }),
    });
    if (res.ok) {
      const task: TaskCardDTO = await res.json();
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, tasks: [...s.tasks, task] } : s
        )
      );
    } else {
      toast("Could not add task", "error");
    }
  }

  async function addSection() {
    const res = await fetch(`/api/projects/${projectId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New section" }),
    });
    if (res.ok) {
      const section: SectionDTO = await res.json();
      setSections((prev) => [...prev, { ...section, tasks: [] }]);
    }
  }

  async function updateTask(taskId: string, patch: Record<string, unknown>) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  async function createTag(name: string): Promise<TagDTO | null> {
    const res = await fetch(`/api/projects/${projectId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return res.ok ? ((await res.json()) as TagDTO) : null;
  }

  if (loading) return <FullSpinner label="Loading project…" />;
  if (notFound || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<Hash size={20} />}
          title="Project not available"
          description="It may have been deleted or you don't have access."
        />
      </div>
    );
  }

  const isFiltered = filtersActive(filters);
  const displaySections = isFiltered
    ? sections.map((s) => ({ ...s, tasks: s.tasks.filter((t) => matchesFilters(t, filters)) }))
    : sections;
  const showFilterBar = view === "board" || view === "list" || view === "calendar";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <MobileMenuButton className="-ml-1" />
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
            style={{ background: `${project.color}22` }}
          >
            <Hash size={12} style={{ color: project.color }} />
          </span>
          <h1 className="truncate text-sm font-semibold tracking-tight">{project.name}</h1>
          <span className="hidden shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] text-faint sm:inline">
            {sections.reduce((n, s) => n + s.tasks.length, 0)} tasks
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Members — click to manage */}
          <button
            onClick={() => setMembersOpen(true)}
            className="hidden items-center gap-1.5 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-surface sm:flex"
            aria-label="Members"
          >
            <div className="flex -space-x-1.5">
              {assignable.slice(0, 4).map((u) => (
                <Avatar
                  key={u.id}
                  name={u.name}
                  src={u.avatar}
                  size="sm"
                  className="ring-2 ring-bg"
                />
              ))}
            </div>
            {assignable.length > 4 && (
              <span className="text-[12px] text-faint">+{assignable.length - 4}</span>
            )}
          </button>

          {/* View tabs */}
          <div className="flex items-center rounded-md border border-border p-0.5">
            <ViewButton active={view === "list"} onClick={() => setView("list")}>
              <List size={14} />
              <span className="hidden sm:inline"> List</span>
            </ViewButton>
            <ViewButton active={view === "board"} onClick={() => setView("board")}>
              <LayoutGrid size={14} />
              <span className="hidden sm:inline"> Board</span>
            </ViewButton>
            <ViewButton active={view === "calendar"} onClick={() => setView("calendar")}>
              <CalendarDays size={14} />
              <span className="hidden md:inline"> Calendar</span>
            </ViewButton>
            <ViewButton active={view === "milestones"} onClick={() => setView("milestones")}>
              <Flag size={14} />
              <span className="hidden md:inline"> Milestones</span>
            </ViewButton>
            <ViewButton active={view === "dashboard"} onClick={() => setView("dashboard")}>
              <BarChart3 size={14} />
              <span className="hidden md:inline"> Dashboard</span>
            </ViewButton>
            <ViewButton active={view === "info"} onClick={() => setView("info")}>
              <Info size={14} />
              <span className="hidden md:inline"> Info</span>
            </ViewButton>
          </div>

          <Button size="sm" variant="secondary" onClick={() => setMembersOpen(true)}>
            <Users size={14} />
            <span className="hidden sm:inline"> Share</span>
          </Button>
        </div>
      </header>

      <MembersDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        projectId={projectId}
        owner={project.owner}
        members={project.members}
        myRole={project.role}
        onChanged={load}
      />

      {showFilterBar && (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          members={assignable}
          tags={project.tags}
          milestones={project.milestones}
        />
      )}

      {/* Body */}
      <div className="min-h-0 flex-1">
        {view === "board" && (
          <KanbanBoard
            sections={displaySections}
            tags={project.tags}
            milestones={project.milestones}
            onSectionsChange={setSections}
            onPersistOrder={persistOrder}
            onReorderSections={reorderSections}
            onTaskClick={setSelectedTaskId}
            onToggleComplete={toggleComplete}
            onQuickAdd={quickAdd}
            onAddSection={addSection}
            canEdit={canEdit && !isFiltered}
          />
        )}
        {view === "list" && (
          <PmsListView
            sections={displaySections}
            milestones={project.milestones}
            tags={project.tags}
            members={assignable}
            canEdit={canEdit}
            dragEnabled={canEdit && !isFiltered}
            onTaskClick={setSelectedTaskId}
            onToggleComplete={toggleComplete}
            onQuickAdd={quickAdd}
            onUpdate={updateTask}
            onCreateTag={createTag}
            onSectionsChange={setSections}
            onPersistOrder={persistOrder}
          />
        )}
        {view === "calendar" && (
          <CalendarView sections={displaySections} onTaskClick={setSelectedTaskId} />
        )}
        {view === "milestones" && (
          <MilestonesView
            milestones={project.milestones}
            sections={sections}
            canEdit={canEdit}
            projectId={projectId}
            onChanged={load}
          />
        )}
        {view === "dashboard" && <DashboardView projectId={projectId} />}
        {view === "info" && (
          <ProjectInfo
            project={project}
            projectId={projectId}
            canEdit={canEdit}
            canManage={canManage}
            isOwner={isOwner}
            taskCount={sections.reduce((n, s) => n + s.tasks.length, 0)}
            onChanged={load}
          />
        )}
      </div>

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          members={assignable}
          sections={sections.map((s) => ({ id: s.id, name: s.name }))}
          milestones={project.milestones}
          tags={project.tags}
          canEdit={canEdit}
          onCreateTag={createTag}
          onClose={() => setSelectedTaskId(null)}
          onChanged={() => {
            load();
            refreshSidebar();
          }}
        />
      )}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-6 items-center gap-1.5 rounded px-2 text-[12px] font-medium transition-colors",
        active ? "bg-surface text-text" : "text-muted hover:text-text"
      )}
    >
      {children}
    </button>
  );
}
