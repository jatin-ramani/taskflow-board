"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Target, Plus, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { FullSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { GoalDetailDialog } from "@/components/goal/goal-detail-dialog";
import { GOAL_STATUS_META } from "@/lib/goal-meta";
import type { GoalDTO, ProjectSummary } from "@/types";

export default function GoalsPage() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<GoalDTO[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [g, p] = await Promise.all([fetch("/api/goals"), fetch("/api/projects")]);
    if (g.ok) setGoals(await g.json());
    if (p.ok) setProjects(await p.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Goals"
        icon={<Target size={16} />}
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> New goal
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-6">
          {loading ? (
            <FullSpinner />
          ) : goals.length === 0 ? (
            <EmptyState
              icon={<Target size={20} />}
              title="No goals yet"
              description="Set a goal and link tasks to it — progress rolls up automatically."
              action={
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus size={14} /> New goal
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} onClick={() => setSelectedGoalId(g.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateGoalDialog
        open={creating}
        onOpenChange={setCreating}
        projects={projects}
        onCreated={(id) => {
          load();
          setSelectedGoalId(id);
        }}
        onError={(m) => toast(m, "error")}
      />

      <GoalDetailDialog
        goalId={selectedGoalId}
        onClose={() => setSelectedGoalId(null)}
        onChanged={load}
      />
    </>
  );
}

function GoalCard({ goal, onClick }: { goal: GoalDTO; onClick: () => void }) {
  const meta = GOAL_STATUS_META[goal.status];
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-xl border border-border bg-elevated p-4 text-left transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-semibold leading-snug">{goal.title}</h3>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      {goal.description && (
        <p className="mt-1 line-clamp-2 text-[12px] text-muted">{goal.description}</p>
      )}

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="text-faint">
            {goal.completedCount}/{goal.taskCount} tasks
          </span>
          <span className="font-medium">{goal.progress}%</span>
        </div>
        <ProgressBar value={goal.progress} color={meta.color} />
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-faint">
        {goal.project && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: goal.project.color }} />
            {goal.project.name}
          </span>
        )}
        {goal.targetDate && (
          <span className="flex items-center gap-1">
            <CalendarClock size={11} /> {format(new Date(goal.targetDate), "MMM d, yyyy")}
          </span>
        )}
      </div>
    </button>
  );
}

function CreateGoalDialog({
  open,
  onOpenChange,
  projects,
  onCreated,
  onError,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projects: ProjectSummary[];
  onCreated: (id: string) => void;
  onError: (m: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setTargetDate("");
    setProjectId("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate: targetDate || null,
        projectId: projectId || null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const goal = await res.json();
      reset();
      onOpenChange(false);
      onCreated(goal.id);
    } else {
      const d = await res.json().catch(() => ({}));
      onError(d.error || "Could not create goal");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="New goal" description="Track an objective across your tasks." />
        <form onSubmit={submit} className="flex flex-col gap-3 p-5">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal title"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
          />
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-[12px] text-muted">
              Target date
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-[12px] text-muted">
              Project
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-9 rounded-md border border-border bg-elevated px-2.5 text-sm outline-none focus:border-accent"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || busy}>
              Create goal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
