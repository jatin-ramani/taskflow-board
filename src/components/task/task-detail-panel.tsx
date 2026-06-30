"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  X,
  Check,
  Trash2,
  Plus,
  Send,
  Play,
  Square,
  Clock,
  History,
  MessageSquare,
  ListTree,
  Tag as TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/task-meta";
import type {
  PublicUser,
  TaskDetailDTO,
  Priority,
  MilestoneDTO,
  TagDTO,
  WorklogEntry,
} from "@/types";

interface Props {
  taskId: string;
  members: PublicUser[];
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
  sections?: { id: string; name: string }[];
  milestones?: MilestoneDTO[];
  tags?: TagDTO[];
  onCreateTag?: (name: string) => Promise<TagDTO | null>;
}

type Tab = "subtasks" | "comments" | "activity" | "worklog";

const selectCls =
  "h-8 min-w-[150px] rounded-md border border-border bg-surface px-2.5 text-[13px] text-text outline-none transition-colors focus:border-accent disabled:opacity-60";

function hms(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}
function hmShort(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (!h && !m) return "0m";
  return `${h ? `${h}h ` : ""}${m ? `${m}m` : ""}`.trim();
}

export function TaskDetailPanel({
  taskId,
  members,
  canEdit,
  onClose,
  onChanged,
  sections = [],
  milestones = [],
  tags = [],
  onCreateTag,
}: Props) {
  const { toast } = useToast();
  const [task, setTask] = useState<TaskDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [goals, setGoals] = useState<{ id: string; title: string }[]>([]);
  const [tab, setTab] = useState<Tab>("subtasks");

  // Work log
  const [logs, setLogs] = useState<WorklogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

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

  const loadLogs = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/time`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
    }
  }, [taskId]);

  useEffect(() => {
    load();
    loadLogs();
  }, [load, loadLogs]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (startRef.current != null)
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

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

  async function logTime(seconds: number, note?: string) {
    if (seconds < 1) return;
    const res = await fetch(`/api/tasks/${taskId}/time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationSeconds: seconds, note: note || undefined }),
    });
    if (res.ok) {
      await Promise.all([loadLogs(), load()]);
      onChanged();
    } else {
      toast("Could not log time", "error");
    }
  }

  function startTimer() {
    startRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
  }
  async function stopTimer() {
    setRunning(false);
    const secs = elapsed;
    setElapsed(0);
    startRef.current = null;
    await logTime(secs);
  }

  const done = !!task?.completedAt;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <aside className="animate-slide-up relative flex h-full w-full max-w-[520px] flex-col border-l border-border bg-elevated shadow-lg">
        {loading || !task ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={22} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex h-13 shrink-0 items-center justify-between border-b border-border px-5 py-3">
              <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: task.project.color }} />
                <span className="truncate font-medium text-text">{task.project.name}</span>
                <span className="truncate text-faint">/ {task.section.name}</span>
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
                    done ? "border-success bg-success text-white" : "border-faint hover:border-text",
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
                  onBlur={() => title.trim() && title !== task.title && patch({ title: title.trim() })}
                  className="flex-1 resize-none bg-transparent text-[17px] font-semibold leading-snug outline-none disabled:cursor-default"
                />
              </div>

              {/* Properties */}
              <div className="mt-6 border-y border-border/70">
                {sections.length > 0 && (
                  <PropRow label="Status">
                    <select
                      disabled={!canEdit}
                      value={task.sectionId}
                      onChange={(e) => patch({ sectionId: e.target.value })}
                      className={selectCls}
                    >
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </PropRow>
                )}
                <PropRow label="Assignee">
                  <select
                    disabled={!canEdit}
                    value={task.assigneeId ?? ""}
                    onChange={(e) => patch({ assigneeId: e.target.value || null })}
                    className={selectCls}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </PropRow>
                <PropRow label="Priority">
                  <select
                    disabled={!canEdit}
                    value={task.priority}
                    onChange={(e) => patch({ priority: e.target.value as Priority })}
                    className={selectCls}
                  >
                    {PRIORITY_ORDER.map((p) => (
                      <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                    ))}
                  </select>
                </PropRow>
                <PropRow label="Type">
                  <input
                    disabled={!canEdit}
                    defaultValue={task.taskType ?? ""}
                    placeholder="e.g. Feature"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (task.taskType ?? "")) patch({ taskType: v || null });
                    }}
                    className={selectCls}
                  />
                </PropRow>
                <PropRow label="Milestone">
                  <select
                    disabled={!canEdit || milestones.length === 0}
                    value={task.milestoneId ?? ""}
                    onChange={(e) => patch({ milestoneId: e.target.value || null })}
                    className={selectCls}
                  >
                    <option value="">None</option>
                    {task.milestone && !milestones.some((m) => m.id === task.milestone!.id) && (
                      <option value={task.milestone.id}>{task.milestone.name}</option>
                    )}
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </PropRow>
                <PropRow label="Tags">
                  <TagPicker
                    selected={task.resolvedTags}
                    all={tags}
                    canEdit={canEdit && (tags.length > 0 || !!onCreateTag)}
                    onToggle={(id, on) =>
                      patch({ tagIds: on ? [...task.tagIds, id] : task.tagIds.filter((t) => t !== id) })
                    }
                    onCreate={
                      onCreateTag
                        ? async (name) => {
                            const t = await onCreateTag(name);
                            if (t) patch({ tagIds: [...task.tagIds, t.id] });
                          }
                        : undefined
                    }
                  />
                </PropRow>
                <PropRow label="Estimation">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      disabled={!canEdit}
                      defaultValue={task.estimateMinutes ? task.estimateMinutes / 60 : ""}
                      placeholder="0"
                      onBlur={(e) => {
                        const v = e.target.value ? Math.round(parseFloat(e.target.value) * 60) : null;
                        if (v !== task.estimateMinutes) patch({ estimateMinutes: v });
                      }}
                      className={cn(selectCls, "min-w-0 w-20")}
                    />
                    <span className="text-[12px] text-faint">hours</span>
                  </div>
                </PropRow>
                <PropRow label="Start date">
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={task.startDate ? format(new Date(task.startDate), "yyyy-MM-dd") : ""}
                    onChange={(e) => patch({ startDate: e.target.value || null })}
                    className={selectCls}
                  />
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
                <PropRow label="Billable">
                  <button
                    disabled={!canEdit}
                    onClick={() => patch({ billable: !task.billable })}
                    className={cn(
                      "relative h-5 w-9 rounded-full transition-colors",
                      task.billable ? "bg-accent" : "bg-border-strong",
                      !canEdit && "opacity-60"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                        task.billable ? "translate-x-4" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </PropRow>
                <PropRow label="Followers">
                  <FollowerPicker
                    followers={task.followers}
                    members={members}
                    canEdit={canEdit}
                    onChange={(ids) => patch({ followerIds: ids })}
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
                    {task.goal && !goals.some((g) => g.id === task.goal!.id) && (
                      <option value={task.goal.id}>{task.goal.title}</option>
                    )}
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
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
                    description !== (task.description ?? "") && patch({ description: description || null })
                  }
                  className="min-h-[88px] w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-colors focus:border-accent placeholder:text-faint"
                />
              </Section>

              {/* Tabs */}
              <div className="mt-7 flex items-center gap-1 border-b border-border">
                <TabBtn icon={<ListTree size={13} />} label={`Subtasks${task.subtasks.length ? ` ${task.subtasks.length}` : ""}`} active={tab === "subtasks"} onClick={() => setTab("subtasks")} />
                <TabBtn icon={<MessageSquare size={13} />} label={`Comments${task.comments.length ? ` ${task.comments.length}` : ""}`} active={tab === "comments"} onClick={() => setTab("comments")} />
                <TabBtn icon={<Clock size={13} />} label="Work" active={tab === "worklog"} onClick={() => setTab("worklog")} />
                <TabBtn icon={<History size={13} />} label="Activity" active={tab === "activity"} onClick={() => setTab("activity")} />
              </div>

              <div className="pt-4">
                {tab === "subtasks" && (
                  <div className="flex flex-col gap-0.5">
                    {task.subtasks.map((st) => (
                      <div key={st.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-surface">
                        <button
                          disabled={!canEdit}
                          onClick={() => toggleSub(st.id, !st.completedAt)}
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                            st.completedAt ? "border-success bg-success text-white" : "border-faint hover:border-text"
                          )}
                        >
                          {st.completedAt && <Check size={9} />}
                        </button>
                        <span className={cn("text-[13px]", st.completedAt && "text-faint line-through")}>{st.title}</span>
                      </div>
                    ))}
                    {task.subtasks.length === 0 && <p className="px-1.5 text-[12px] text-faint">No subtasks</p>}
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
                  </div>
                )}

                {tab === "comments" && (
                  <div className="flex flex-col gap-4">
                    {task.comments.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <Avatar name={c.author.name} src={c.author.avatar} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[13px] font-medium">{c.author.name}</span>
                            <span className="text-[11px] text-faint">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    {task.comments.length === 0 && <p className="text-[12px] text-faint">No comments yet</p>}
                  </div>
                )}

                {tab === "worklog" && (
                  <WorkLog
                    task={task}
                    logs={logs}
                    canEdit={canEdit}
                    running={running}
                    elapsed={elapsed}
                    onStart={startTimer}
                    onStop={stopTimer}
                    onManual={logTime}
                  />
                )}

                {tab === "activity" && (
                  <div className="flex flex-col gap-3">
                    {task.activities.map((a) => (
                      <div key={a.id} className="flex items-start gap-2.5 text-[12px]">
                        <Avatar name={a.user.name} src={a.user.avatar} size="xs" />
                        <p className="leading-relaxed text-muted">
                          <span className="font-medium text-text">{a.user.name}</span> {describeActivity(a.action, a.details)}
                          <span className="ml-1.5 text-faint">{timeAgo(a.createdAt)}</span>
                        </p>
                      </div>
                    ))}
                    {task.activities.length === 0 && <p className="text-[12px] text-faint">No activity</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Comment composer (only on comments tab) */}
            {tab === "comments" && (
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
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function describeActivity(action: string, details: string | null): string {
  switch (action) {
    case "CREATED": return "created this task";
    case "COMPLETED": return "completed this task";
    case "REOPENED": return "reopened this task";
    case "ASSIGNED": return "changed the assignee";
    case "MOVED": return "moved this task";
    case "COMMENTED": return "commented";
    case "TIME_LOGGED": {
      try {
        const d = details ? JSON.parse(details) : null;
        return `logged ${d?.seconds ? hmShort(d.seconds) : "time"}`;
      } catch {
        return "logged time";
      }
    }
    default: return action.toLowerCase().replace(/_/g, " ");
  }
}

function WorkLog({
  task,
  logs,
  canEdit,
  running,
  elapsed,
  onStart,
  onStop,
  onManual,
}: {
  task: TaskDetailDTO;
  logs: WorklogEntry[];
  canEdit: boolean;
  running: boolean;
  elapsed: number;
  onStart: () => void;
  onStop: () => void;
  onManual: (seconds: number, note?: string) => void;
}) {
  const [h, setH] = useState("");
  const [m, setM] = useState("");
  const [note, setNote] = useState("");
  const total = logs.reduce((n, l) => n + l.durationSeconds, 0);
  const estSecs = (task.estimateMinutes ?? 0) * 60;
  const pct = estSecs ? Math.min(100, Math.round((total / estSecs) * 100)) : 0;

  function submit() {
    const secs = (parseInt(h || "0") || 0) * 3600 + (parseInt(m || "0") || 0) * 60;
    if (secs < 1) return;
    onManual(secs, note.trim() || undefined);
    setH(""); setM(""); setNote("");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rollup */}
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted">Logged <span className="font-semibold text-text">{hmShort(total)}</span></span>
          {estSecs > 0 && <span className="text-faint">of {hmShort(estSecs)} estimated</span>}
        </div>
        {estSecs > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {canEdit && (
        <>
          {/* Timer */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className={cn("font-mono text-[18px] tabular-nums", running ? "text-accent" : "text-muted")}>
              {hms(elapsed)}
            </span>
            {running ? (
              <Button size="sm" variant="danger" onClick={onStop}>
                <Square size={13} /> Stop & log
              </Button>
            ) : (
              <Button size="sm" onClick={onStart}>
                <Play size={13} /> Start timer
              </Button>
            )}
          </div>

          {/* Manual */}
          <div className="flex flex-wrap items-center gap-2">
            <input value={h} onChange={(e) => setH(e.target.value)} type="number" min={0} placeholder="h" className="h-8 w-14 rounded-md border border-border bg-surface px-2 text-[13px] outline-none focus:border-accent" />
            <input value={m} onChange={(e) => setM(e.target.value)} type="number" min={0} max={59} placeholder="m" className="h-8 w-14 rounded-md border border-border bg-surface px-2 text-[13px] outline-none focus:border-accent" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 text-[13px] outline-none focus:border-accent" />
            <Button size="sm" variant="secondary" onClick={submit}>Log</Button>
          </div>
        </>
      )}

      {/* Entries */}
      <div className="flex flex-col gap-2">
        {logs.map((l) => (
          <div key={l.id} className="flex items-center gap-2.5 text-[12px]">
            <Avatar name={l.user.name} src={l.user.avatar} size="xs" />
            <span className="font-medium text-text">{hmShort(l.durationSeconds)}</span>
            {l.note && <span className="truncate text-muted">— {l.note}</span>}
            <span className="ml-auto shrink-0 text-faint">{timeAgo(l.createdAt)}</span>
          </div>
        ))}
        {logs.length === 0 && <p className="text-[12px] text-faint">No time logged yet</p>}
      </div>
    </div>
  );
}

function TagPicker({
  selected,
  all,
  canEdit,
  onToggle,
  onCreate,
}: {
  selected: TagDTO[];
  all: TagDTO[];
  canEdit: boolean;
  onToggle: (id: string, on: boolean) => void;
  onCreate?: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const selectedIds = new Set(selected.map((t) => t.id));
  const filtered = all.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  const canCreate = onCreate && q.trim() && !all.some((t) => t.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <div ref={ref} className="relative flex items-center justify-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-1">
        {selected.map((t) => (
          <span key={t.id} className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ background: `${t.color}22`, color: t.color }}>
            {t.name}
          </span>
        ))}
        {selected.length === 0 && <span className="text-[12px] text-faint">None</span>}
      </div>
      {canEdit && (
        <button onClick={() => setOpen((o) => !o)} className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface hover:text-text">
          <Plus size={14} />
        </button>
      )}
      {open && (
        <div className="animate-slide-up absolute right-0 top-8 z-30 w-56 rounded-md border border-border bg-overlay p-1.5 shadow-popover">
          <div className="mb-1 flex items-center gap-1.5 rounded border border-border bg-surface px-1.5">
            <TagIcon size={12} className="text-faint" />
            <input value={q} autoFocus onChange={(e) => setQ(e.target.value)} placeholder="Search or create…" className="h-6 flex-1 bg-transparent text-[12px] outline-none" />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.map((t) => {
              const on = selectedIds.has(t.id);
              return (
                <button key={t.id} onClick={() => onToggle(t.id, !on)} className="flex w-full items-center justify-between rounded px-1.5 py-1 text-left hover:bg-surface">
                  <span className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ background: `${t.color}22`, color: t.color }}>{t.name}</span>
                  {on && <Check size={13} className="text-accent" />}
                </button>
              );
            })}
            {canCreate && (
              <button onClick={() => { onCreate!(q.trim()); setQ(""); }} className="flex w-full items-center gap-1.5 rounded px-1.5 py-1.5 text-left text-[12px] text-accent hover:bg-surface">
                <Plus size={13} /> Create “{q.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FollowerPicker({
  followers,
  members,
  canEdit,
  onChange,
}: {
  followers: PublicUser[];
  members: PublicUser[];
  canEdit: boolean;
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const ids = new Set(followers.map((f) => f.id));
  function toggle(id: string) {
    const next = ids.has(id) ? [...ids].filter((x) => x !== id) : [...ids, id];
    onChange(next);
  }

  return (
    <div ref={ref} className="relative flex items-center justify-end gap-1.5">
      <div className="flex -space-x-1.5">
        {followers.slice(0, 4).map((f) => (
          <Avatar key={f.id} name={f.name} src={f.avatar} size="xs" className="ring-2 ring-elevated" />
        ))}
      </div>
      {followers.length === 0 && <span className="text-[12px] text-faint">None</span>}
      {canEdit && (
        <button onClick={() => setOpen((o) => !o)} className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface hover:text-text">
          <Plus size={14} />
        </button>
      )}
      {open && (
        <div className="animate-slide-up absolute right-0 top-8 z-30 w-52 rounded-md border border-border bg-overlay p-1 shadow-popover">
          <div className="max-h-52 overflow-y-auto">
            {members.map((m) => (
              <button key={m.id} onClick={() => toggle(m.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-surface">
                <Avatar name={m.name} src={m.avatar} size="xs" />
                <span className="flex-1 truncate text-[13px]">{m.name}</span>
                {ids.has(m.id) && <Check size={13} className="text-accent" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-[12px] font-medium transition-colors",
        active ? "border-accent text-text" : "border-transparent text-faint hover:text-muted"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 py-2.5 last:border-b-0">
      <span className="shrink-0 text-[13px] text-muted">{label}</span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</p>
      {children}
    </div>
  );
}
