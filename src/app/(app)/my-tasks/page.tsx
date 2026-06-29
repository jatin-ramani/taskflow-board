"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CheckSquare, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { FullSpinner } from "@/components/ui/spinner";
import { PriorityDot, DueDate } from "@/components/board/task-card";
import { TaskDetailPanel } from "@/components/task/task-detail-panel";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import type { MyTaskDTO, PublicUser } from "@/types";

type Filter = "active" | "completed" | "all";

export default function MyTasksPage() {
  const { data: session } = useSession();
  const [filter, setFilter] = useState<Filter>("active");
  const [tasks, setTasks] = useState<MyTaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const me: PublicUser | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? "Me",
        publicId: session.user.publicId,
        username: session.user.username,
        avatar: session.user.image ?? null,
      }
    : null;

  const load = useCallback(async () => {
    const qs =
      filter === "all" ? "" : `&completed=${filter === "completed"}`;
    const res = await fetch(`/api/tasks?scope=mine${qs}`);
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(task: MyTaskDTO) {
    const completed = !task.completedAt;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, completedAt: completed ? new Date().toISOString() : null }
          : t
      )
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (filter !== "all") setTimeout(load, 200);
  }

  return (
    <>
      <PageHeader
        title="My Tasks"
        icon={<CheckSquare size={16} />}
        actions={
          <div className="flex items-center rounded-md border border-border p-0.5">
            {(["active", "completed", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "h-6 rounded px-2.5 text-[12px] font-medium capitalize transition-colors",
                  filter === f ? "bg-surface text-text" : "text-muted hover:text-text"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {loading ? (
            <FullSpinner />
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={<CheckSquare size={20} />}
              title={filter === "completed" ? "Nothing completed yet" : "No tasks assigned to you"}
              description="Tasks assigned to you across all projects show up here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-elevated">
              {tasks.map((task) => {
                const done = !!task.completedAt;
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="flex cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-surface"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(task);
                      }}
                      className={cn(
                        "flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border transition-colors",
                        done
                          ? "border-success bg-success text-white"
                          : "border-faint hover:border-text"
                      )}
                    >
                      {done && <Check size={10} />}
                    </button>
                    <PriorityDot priority={task.priority} />
                    <span
                      className={cn(
                        "flex-1 truncate text-[13px]",
                        done && "text-faint line-through"
                      )}
                    >
                      {task.title}
                    </span>
                    <Link
                      href={`/projects/${task.project.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] text-faint hover:text-muted"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: task.project.color }}
                      />
                      {task.project.name}
                    </Link>
                    <DueDate date={task.dueDate} done={done} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          members={me ? [me] : []}
          canEdit
          onClose={() => setSelectedTaskId(null)}
          onChanged={() => {
            load();
            refreshSidebar();
          }}
        />
      )}
    </>
  );
}
