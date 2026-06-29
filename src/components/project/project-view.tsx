"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Hash, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { FullSpinner } from "@/components/ui/spinner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { KanbanBoard } from "@/components/board/kanban-board";
import { ListView } from "@/components/project/list-view";
import { TaskDetailPanel } from "@/components/task/task-detail-panel";
import { MembersDialog } from "@/components/project/members-dialog";
import { useToast } from "@/components/ui/toast";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import type {
  ProjectDetailDTO,
  SectionDTO,
  TaskCardDTO,
  PublicUser,
} from "@/types";

type View = "board" | "list";

export function ProjectView({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [project, setProject] = useState<ProjectDetailDTO | null>(null);
  const [sections, setSections] = useState<SectionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<View>("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);

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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-5 w-5 items-center justify-center rounded"
            style={{ background: `${project.color}22` }}
          >
            <Hash size={12} style={{ color: project.color }} />
          </span>
          <h1 className="text-sm font-semibold tracking-tight">{project.name}</h1>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-faint">
            {sections.reduce((n, s) => n + s.tasks.length, 0)} tasks
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Members — click to manage */}
          <button
            onClick={() => setMembersOpen(true)}
            className="flex items-center gap-1.5 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-surface"
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

          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border p-0.5">
            <ViewButton active={view === "board"} onClick={() => setView("board")}>
              <LayoutGrid size={14} /> Board
            </ViewButton>
            <ViewButton active={view === "list"} onClick={() => setView("list")}>
              <List size={14} /> List
            </ViewButton>
          </div>

          <Button size="sm" variant="secondary" onClick={() => setMembersOpen(true)}>
            <Users size={14} /> Share
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

      {/* Body */}
      <div className="min-h-0 flex-1">
        {view === "board" ? (
          <KanbanBoard
            sections={sections}
            onSectionsChange={setSections}
            onPersistOrder={persistOrder}
            onTaskClick={setSelectedTaskId}
            onToggleComplete={toggleComplete}
            onQuickAdd={quickAdd}
            onAddSection={addSection}
            canEdit={canEdit}
          />
        ) : (
          <ListView
            sections={sections}
            onTaskClick={setSelectedTaskId}
            onToggleComplete={toggleComplete}
            onQuickAdd={quickAdd}
            canEdit={canEdit}
          />
        )}
      </div>

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          members={assignable}
          canEdit={canEdit}
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
