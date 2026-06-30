"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2, Check, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { GOAL_STATUS_META, GOAL_STATUS_ORDER } from "@/lib/goal-meta";
import type { GoalDetailDTO, GoalStatus } from "@/types";

const fieldCls =
  "h-8 rounded-md border border-border bg-surface px-2.5 text-[13px] outline-none focus:border-accent";

export function GoalDetailDialog({
  goalId,
  onClose,
  onChanged,
}: {
  goalId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [goal, setGoal] = useState<GoalDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    if (!goalId) return;
    setLoading(true);
    const res = await fetch(`/api/goals/${goalId}`);
    if (res.ok) {
      const data: GoalDetailDTO = await res.json();
      setGoal(data);
      setTitle(data.title);
      setDescription(data.description ?? "");
    }
    setLoading(false);
  }, [goalId]);

  useEffect(() => {
    if (goalId) load();
  }, [goalId, load]);

  async function patch(data: Record<string, unknown>) {
    if (!goalId) return;
    const res = await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await load();
      onChanged();
    } else toast("Update failed", "error");
  }

  async function toggleTask(id: string, completed: boolean) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    await load();
    onChanged();
  }

  async function unlink(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: null }),
    });
    await load();
    onChanged();
  }

  async function remove() {
    if (!goalId || !confirm("Delete this goal? Linked tasks are kept.")) return;
    const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Goal deleted", "success");
      onChanged();
      onClose();
    }
  }

  return (
    <Dialog open={!!goalId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {loading || !goal ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={20} />
          </div>
        ) : (
          <>
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Target size={15} />
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => title.trim() && title !== goal.title && patch({ title: title.trim() })}
                  className="flex-1 bg-transparent pr-8 text-[15px] font-semibold outline-none"
                />
              </div>

              {/* Progress */}
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className="text-muted">
                    {goal.completedCount} of {goal.taskCount} tasks
                  </span>
                  <span className="font-medium">{goal.progress}%</span>
                </div>
                <ProgressBar
                  value={goal.progress}
                  color={GOAL_STATUS_META[goal.status].color}
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-1 items-center gap-2 text-[12px] text-muted">
                  Status
                  <div className="min-w-0 flex-1 rounded-md border border-border bg-surface">
                    <Select
                      value={goal.status}
                      onChange={(v) => patch({ status: v as GoalStatus })}
                      options={GOAL_STATUS_ORDER.map((s) => ({
                        value: s,
                        label: GOAL_STATUS_META[s].label,
                        leading: (
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: GOAL_STATUS_META[s].color }} />
                        ),
                      }))}
                    />
                  </div>
                </label>
                <label className="flex items-center gap-2 text-[12px] text-muted">
                  Target
                  <input
                    type="date"
                    value={goal.targetDate ? format(new Date(goal.targetDate), "yyyy-MM-dd") : ""}
                    onChange={(e) => patch({ targetDate: e.target.value || null })}
                    className={fieldCls}
                  />
                </label>
              </div>

              {/* Description */}
              <textarea
                value={description}
                rows={2}
                placeholder="Add a description…"
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() =>
                  description !== (goal.description ?? "") &&
                  patch({ description: description || null })
                }
                className="mt-3 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent placeholder:text-faint"
              />

              {/* Linked tasks */}
              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                Linked tasks {goal.taskCount > 0 && `· ${goal.taskCount}`}
              </p>
              {goal.tasks.length === 0 ? (
                <p className="text-[12px] text-faint">
                  No tasks yet. Open a task and set its Goal to link it here.
                </p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {goal.tasks.map((t) => {
                    const done = !!t.completedAt;
                    return (
                      <div
                        key={t.id}
                        className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-surface"
                      >
                        <button
                          onClick={() => toggleTask(t.id, !done)}
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                            done
                              ? "border-success bg-success text-white"
                              : "border-faint hover:border-text"
                          )}
                        >
                          {done && <Check size={9} />}
                        </button>
                        <span className={cn("flex-1 truncate text-[13px]", done && "text-faint line-through")}>
                          {t.title}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-faint">
                          <span className="h-2 w-2 rounded-full" style={{ background: t.project.color }} />
                          {t.project.name}
                        </span>
                        <button
                          onClick={() => unlink(t.id)}
                          className="text-[11px] text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                        >
                          Unlink
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={remove}
                className="mt-6 flex items-center gap-1.5 text-[12px] text-faint transition-colors hover:text-danger"
              >
                <Trash2 size={13} /> Delete goal
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
