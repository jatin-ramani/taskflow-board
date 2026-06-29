"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { X, Check, Trash2, Plus, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/task-meta";
import type { PublicUser, TaskDetailDTO, Priority } from "@/types";

interface Props {
  taskId: string;
  members: PublicUser[];
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}

const selectCls =
  "h-8 min-w-[150px] rounded-md border border-border bg-surface px-2.5 text-[13px] text-text outline-none transition-colors focus:border-accent disabled:opacity-60";

export function TaskDetailPanel({ taskId, members, canEdit, onClose, onChanged }: Props) {
  const { toast } = useToast();
  const [task, setTask] = useState<TaskDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [goals, setGoals] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => (r.ok ? r.json() : []))
      .then((gs) => setGoals(gs.map((g: { id: string; title: string }) => ({ id: g.id, title: g.title }))))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const data: TaskDetailDTO = await res.json();
      setTask(data);
      setTitle(data.title);
      setDescription(data.description ?? "");
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await load();
      onChanged();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Update failed", "error");
    }
  }

  async function addSubtask() {
    const t = subtaskTitle.trim();
    if (!t || !task) return;
    setSubtaskTitle("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: t,
        projectId: task.projectId,
        sectionId: task.section.id,
        parentTaskId: task.id,
      }),
    });
    if (res.ok) {
      await load();
      onChanged();
    }
  }

  async function toggleSub(id: string, completed: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (res.ok) {
      await load();
      onChanged();
    }
  }

  async function postComment() {
    const c = comment.trim();
    if (!c) return;
    setComment("");
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: c }),
    });
    if (res.ok) await load();
  }

  async function deleteTask() {
    if (!confirm("Delete this task?")) return;
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Task deleted", "success");
      onChanged();
      onClose();
    }
  }

  const done = !!task?.completedAt;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <aside className="animate-slide-up relative flex h-full w-full max-w-[480px] flex-col border-l border-border bg-elevated shadow-lg">
        {loading || !task ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={22} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex h-13 shrink-0 items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2 text-[12px] text-muted">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: task.project.color }}
                />
                <span className="font-medium text-text">{task.project.name}</span>
                <span className="text-faint">/ {task.section.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button
                    onClick={deleteTask}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-danger"
                    aria-label="Delete task"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-text"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Complete + title */}
              <div className="flex items-start gap-3">
                <button
                  disabled={!canEdit}
                  onClick={() => patch({ completed: !done })}
                  className={cn(
                    "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    done
                      ? "border-success bg-success text-white"
                      : "border-faint hover:border-text",
                    !canEdit && "cursor-default"
                  )}
                >
                  {done && <Check size={12} />}
                </button>
                <textarea
                  value={title}
                  disabled={!canEdit}
                  rows={1}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() =>
                    title.trim() && title !== task.title && patch({ title: title.trim() })
                  }
                  className="flex-1 resize-none bg-transparent text-[17px] font-semibold leading-snug outline-none disabled:cursor-default"
                />
              </div>

              {/* Properties */}
              <div className="mt-6 border-y border-border/70">
                <PropRow label="Priority">
                  <select
                    disabled={!canEdit}
                    value={task.priority}
                    onChange={(e) => patch({ priority: e.target.value as Priority })}
                    className={selectCls}
                  >
                    {PRIORITY_ORDER.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_META[p].label}
                      </option>
                    ))}
                  </select>
                </PropRow>
                <PropRow label="Assignee">
                  <select
                    disabled={!canEdit}
                    value={task.assigneeId ?? ""}
                    onChange={(e) => patch({ assigneeId: e.target.value || null })}
                    className={selectCls}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </PropRow>
                <PropRow label="Due date">
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""}
                    onChange={(e) => patch({ dueDate: e.target.value || null })}
                    className={selectCls}
                  />
                </PropRow>
                <PropRow label="Goal">
                  <select
                    disabled={!canEdit}
                    value={task.goalId ?? ""}
                    onChange={(e) => patch({ goalId: e.target.value || null })}
                    className={selectCls}
                  >
                    <option value="">No goal</option>
                    {/* keep the current goal selectable even if not in my list */}
                    {task.goal && !goals.some((g) => g.id === task.goal!.id) && (
                      <option value={task.goal.id}>{task.goal.title}</option>
                    )}
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </PropRow>
              </div>

              {/* Description */}
              <Section title="Description">
                <textarea
                  value={description}
                  disabled={!canEdit}
                  rows={4}
                  placeholder={canEdit ? "Add a description…" : "No description"}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() =>
                    description !== (task.description ?? "") &&
                    patch({ description: description || null })
                  }
                  className="min-h-[88px] w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-colors focus:border-accent placeholder:text-faint"
                />
              </Section>

              {/* Subtasks */}
              <Section
                title={`Subtasks${task.subtasks.length ? ` · ${task.subtasks.length}` : ""}`}
              >
                <div className="flex flex-col gap-0.5">
                  {task.subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-surface"
                    >
                      <button
                        disabled={!canEdit}
                        onClick={() => toggleSub(st.id, !st.completedAt)}
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                          st.completedAt
                            ? "border-success bg-success text-white"
                            : "border-faint hover:border-text"
                        )}
                      >
                        {st.completedAt && <Check size={9} />}
                      </button>
                      <span
                        className={cn(
                          "text-[13px]",
                          st.completedAt && "text-faint line-through"
                        )}
                      >
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <div className="mt-1 flex items-center gap-2 rounded-md px-1.5 py-1">
                    <Plus size={14} className="text-faint" />
                    <input
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                      placeholder="Add subtask…"
                      className="flex-1 bg-transparent py-0.5 text-[13px] outline-none placeholder:text-faint"
                    />
                  </div>
                )}
              </Section>

              {/* Comments */}
              <Section title="Comments">
                <div className="flex flex-col gap-4">
                  {task.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar name={c.author.name} src={c.author.avatar} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-medium">{c.author.name}</span>
                          <span className="text-[11px] text-faint">
                            {timeAgo(c.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {task.comments.length === 0 && (
                    <p className="text-[12px] text-faint">No comments yet</p>
                  )}
                </div>
              </Section>
            </div>

            {/* Comment composer */}
            <div className="shrink-0 border-t border-border p-3.5">
              <div className="flex items-end gap-2">
                <textarea
                  value={comment}
                  rows={1}
                  placeholder="Write a comment…"
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      postComment();
                    }
                  }}
                  className="max-h-28 flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-accent placeholder:text-faint"
                />
                <Button size="icon" onClick={postComment} disabled={!comment.trim()}>
                  <Send size={15} />
                </Button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 py-3 last:border-b-0">
      <span className="text-[13px] text-muted">{label}</span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
        {title}
      </p>
      {children}
    </div>
  );
}
