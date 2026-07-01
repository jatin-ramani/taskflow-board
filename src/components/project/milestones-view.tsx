"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Flag, Plus, MoreHorizontal, Pencil, Trash2, Check, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/common/empty-state";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { SectionDTO, MilestoneDTO } from "@/types";

const SWATCHES = ["#5b5fc7", "#16a34a", "#eb5757", "#f59e0b", "#3b82f6", "#a855f7", "#0ea5e9", "#ec4899"];

export function MilestonesView({
  milestones,
  sections,
  canEdit,
  projectId,
  onChanged,
}: {
  milestones: MilestoneDTO[];
  sections: SectionDTO[];
  canEdit: boolean;
  projectId: string;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; ms?: MilestoneDTO } | null>(null);
  const [confirmDel, setConfirmDel] = useState<MilestoneDTO | null>(null);
  const allTasks = sections.flatMap((s) => s.tasks);

  function counts(id: string) {
    const linked = allTasks.filter((t) => t.milestoneId === id);
    const done = linked.filter((t) => t.completedAt).length;
    return { total: linked.length, done, pct: linked.length ? Math.round((done / linked.length) * 100) : 0 };
  }

  async function toggleComplete(m: MilestoneDTO) {
    await fetch(`/api/milestones/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !m.completed }),
    });
    onChanged();
  }

  async function remove(m: MilestoneDTO) {
    await fetch(`/api/milestones/${m.id}`, { method: "DELETE" });
    toast("Milestone deleted", "success");
    onChanged();
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Flag size={16} className="text-muted" /> Milestones
          </h2>
          {canEdit && (
            <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
              <Plus size={14} /> New milestone
            </Button>
          )}
        </div>

        {milestones.length === 0 ? (
          <EmptyState
            icon={<Flag size={20} />}
            title="No milestones yet"
            description="Group tasks into milestones to track delivery."
            action={
              canEdit ? (
                <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
                  <Plus size={14} /> New milestone
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {milestones.map((m) => {
              const c = counts(m.id);
              return (
                <div key={m.id} className="rounded-lg border border-border bg-elevated p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded" style={{ background: `${m.color}22` }}>
                        <Flag size={13} style={{ color: m.color }} />
                      </span>
                      <h3 className={cn("truncate text-[14px] font-semibold", m.completed && "text-faint line-through")}>
                        {m.name}
                      </h3>
                    </div>
                    {canEdit && (
                      <RowMenu
                        onEdit={() => setDialog({ mode: "edit", ms: m })}
                        onDelete={() => setConfirmDel(m)}
                        onToggle={() => toggleComplete(m)}
                        completed={m.completed}
                      />
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="text-faint">{c.done}/{c.total} tasks</span>
                      <span className="font-medium">{m.completed ? "Done" : `${c.pct}%`}</span>
                    </div>
                    <ProgressBar value={m.completed ? 100 : c.pct} color={m.color} />
                  </div>

                  {m.dueDate && (
                    <p className="mt-3 flex items-center gap-1 text-[11px] text-faint">
                      <CalendarClock size={11} /> {format(new Date(m.dueDate), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dialog && (
        <MilestoneDialog
          projectId={projectId}
          milestone={dialog.mode === "edit" ? dialog.ms : undefined}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            onChanged();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete milestone?"
        description={
          confirmDel
            ? `"${confirmDel.name}" will be removed. Tasks stay, but lose this milestone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDel) remove(confirmDel);
        }}
      />
    </div>
  );
}

function RowMenu({
  onEdit,
  onDelete,
  onToggle,
  completed,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  completed: boolean;
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
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface hover:text-text"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="animate-slide-up absolute right-0 top-7 z-20 w-44 rounded-md border border-border bg-overlay p-1 shadow-popover">
          <MI icon={<Check size={14} />} label={completed ? "Mark active" : "Mark complete"} onClick={() => { onToggle(); setOpen(false); }} />
          <MI icon={<Pencil size={14} />} label="Edit" onClick={() => { onEdit(); setOpen(false); }} />
          <MI icon={<Trash2 size={14} />} label="Delete" danger onClick={() => { onDelete(); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

function MI({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-[13px] text-muted hover:bg-surface",
        danger ? "hover:text-danger" : "hover:text-text"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MilestoneDialog({
  projectId,
  milestone,
  onClose,
  onSaved,
}: {
  projectId: string;
  milestone?: MilestoneDTO;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(milestone?.name ?? "");
  const [color, setColor] = useState(milestone?.color ?? SWATCHES[0]);
  const [dueDate, setDueDate] = useState(
    milestone?.dueDate ? format(new Date(milestone.dueDate), "yyyy-MM-dd") : ""
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    const body = JSON.stringify({ name: name.trim(), color, dueDate: dueDate || null });
    const res = milestone
      ? await fetch(`/api/milestones/${milestone.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch(`/api/projects/${projectId}/milestones`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    setBusy(false);
    if (res.ok) onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader title={milestone ? "Edit milestone" : "New milestone"} />
        <div className="flex flex-col gap-3 p-5">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Milestone name" />
          <div>
            <p className="mb-1.5 text-[12px] text-muted">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn("h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-elevated", color === c ? "ring-text" : "ring-transparent")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-[12px] text-muted">
            Due date
            <div className="h-9 rounded-md border border-border bg-surface">
              <DatePicker
                value={dueDate || null}
                placeholder="No date"
                className="h-9"
                onChange={(v) => setDueDate(v ?? "")}
              />
            </div>
          </label>
          <div className="mt-1 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={!name.trim() || busy}>{milestone ? "Save" : "Create"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
