"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Info,
  Trash2,
  UserPlus,
  Crown,
  Check,
  Users,
  ListTodo,
  CalendarDays,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import type { ProjectDetailDTO, PublicUser, ProjectRole, FriendItem } from "@/types";

const PROJECT_COLORS = [
  "#5b5fc7", "#4f9dff", "#0ea5e9", "#16a34a", "#22c55e",
  "#f59e0b", "#eb5757", "#ec4899", "#a855f7", "#64748b",
];
const ASSIGNABLE_ROLES: ProjectRole[] = ["ADMIN", "EDITOR", "VIEWER"];
const roleLabel = (r: ProjectRole) => r.charAt(0) + r.slice(1).toLowerCase();

export function ProjectInfo({
  project,
  projectId,
  canEdit,
  canManage,
  isOwner,
  taskCount,
  onChanged,
}: {
  project: ProjectDetailDTO;
  projectId: string;
  canEdit: boolean;
  canManage: boolean;
  isOwner: boolean;
  taskCount: number;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();

  // Details form
  const initialDue = project.dueDate ? project.dueDate.slice(0, 10) : null;
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [color, setColor] = useState(project.color);
  const [dueDate, setDueDate] = useState<string | null>(initialDue);
  const [saving, setSaving] = useState(false);

  // Members
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<ProjectRole>("EDITOR");
  const [busy, setBusy] = useState(false);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!canManage) return;
    fetch("/api/friends")
      .then((r) => (r.ok ? r.json() : []))
      .then(setFriends)
      .catch(() => {});
  }, [canManage]);

  // Re-sync the form when the project's server-side values change (after a save,
  // or an external edit) so a background refetch never leaves the fields stale.
  // Guarded by a ref so refetches that DON'T touch these fields (e.g. member
  // changes) don't clobber the user's in-progress edits.
  const serverRef = useRef({
    name: project.name,
    description: project.description ?? "",
    color: project.color,
    dueDate: initialDue,
  });
  useEffect(() => {
    const nextDue = project.dueDate ? project.dueDate.slice(0, 10) : null;
    const s = serverRef.current;
    if (
      project.name === s.name &&
      (project.description ?? "") === s.description &&
      project.color === s.color &&
      nextDue === s.dueDate
    ) {
      return;
    }
    serverRef.current = {
      name: project.name,
      description: project.description ?? "",
      color: project.color,
      dueDate: nextDue,
    };
    setName(project.name);
    setDescription(project.description ?? "");
    setColor(project.color);
    setDueDate(nextDue);
  }, [project.name, project.description, project.color, project.dueDate, initialDue]);

  const dirty =
    name.trim() !== project.name ||
    (description.trim() || "") !== (project.description ?? "") ||
    color !== project.color ||
    (dueDate || null) !== initialDue;

  const colors = PROJECT_COLORS.includes(color) ? PROJECT_COLORS : [color, ...PROJECT_COLORS];

  async function save() {
    if (!name.trim()) {
      toast("Project name can't be empty", "error");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        color,
        dueDate,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast("Project updated", "success");
      onChanged();
      refreshSidebar();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not update project", "error");
    }
  }

  const inProject = new Set([project.owner.id, ...project.members.map((m) => m.user.id)]);
  const addable = friends.filter((f) => !inProject.has(f.user.id));

  function after(res: Response, okMsg: string) {
    if (res.ok) {
      toast(okMsg, "success");
      onChanged();
      refreshSidebar();
    } else {
      // Surface the failure and refetch so the UI (e.g. a role dropdown) snaps
      // back to the real server state instead of silently showing a stale value.
      toast("Something went wrong — please try again", "error");
      onChanged();
    }
  }

  async function addMember() {
    if (!addUserId) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: addUserId, role: addRole }),
    });
    setBusy(false);
    if (res.ok) {
      setAddUserId("");
      after(res, "Member added");
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not add member", "error");
    }
  }

  async function changeRole(memberId: string, role: ProjectRole) {
    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    after(res, "Role updated");
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
      method: "DELETE",
    });
    after(res, "Member removed");
  }

  async function del() {
    setDeleting(true);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setDeleting(false);
    setConfirmDelete(false);
    if (res.ok) {
      toast("Project deleted", "success");
      refreshSidebar();
      router.push("/projects");
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not delete project", "error");
    }
  }

  const memberCount = project.members.length + 1; // + owner

  return (
    <div className="h-full overflow-y-auto px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          {/* Main column */}
          <div className="flex min-w-0 flex-col gap-4">
            {/* Details */}
            <Card title="Project details" icon={<Info size={14} />}>
              <div className="flex flex-col gap-4">
                <Field label="Name">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={500}
                    disabled={!canEdit}
                    placeholder={canEdit ? "What's this project about? (optional)" : "No description"}
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Color">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => setColor(c)}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full transition-transform",
                            canEdit && "hover:scale-110"
                          )}
                          style={{
                            background: c,
                            boxShadow:
                              color === c
                                ? `0 0 0 2px var(--c-elevated), 0 0 0 4px ${c}`
                                : undefined,
                          }}
                          aria-label={`Color ${c}`}
                        >
                          {color === c && <Check size={13} className="text-white" />}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Due date">
                    <DatePicker value={dueDate} onChange={setDueDate} disabled={!canEdit} />
                  </Field>
                </div>
              </div>
              {canEdit && (
                <div className="mt-4 flex items-center justify-end gap-3">
                  {dirty && <span className="text-[12px] text-faint">Unsaved changes</span>}
                  <Button onClick={save} disabled={!dirty || saving}>
                    {saving ? <Spinner size={15} className="text-white" /> : "Save changes"}
                  </Button>
                </div>
              )}
            </Card>

            {/* Members */}
            <Card
              title="Members"
              icon={<Users size={14} />}
              action={<span className="text-[12px] text-faint">{memberCount}</span>}
            >
              {canManage && (
                <div className="mb-3 rounded-lg border border-border bg-surface/40 p-3">
                  <p className="mb-2 text-[12px] font-medium text-muted">Add a friend</p>
                  {addable.length === 0 ? (
                    <p className="text-[12px] text-faint">
                      {friends.length === 0
                        ? "Add friends first to share this project with them."
                        : "All your friends are already in this project."}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 rounded-md border border-border bg-surface">
                        <Select
                          value={addUserId}
                          searchable
                          placeholder="Select a friend…"
                          onChange={setAddUserId}
                          options={addable.map((f) => ({
                            value: f.user.id,
                            label: f.user.name,
                            leading: <Avatar name={f.user.name} src={f.user.avatar} size="xs" />,
                          }))}
                        />
                      </div>
                      <div className="w-28 rounded-md border border-border bg-surface">
                        <Select
                          value={addRole}
                          onChange={(v) => setAddRole(v as ProjectRole)}
                          options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))}
                        />
                      </div>
                      <Button size="icon" onClick={addMember} disabled={!addUserId || busy}>
                        {busy ? <Spinner size={14} className="text-white" /> : <UserPlus size={15} />}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <MemberRow user={project.owner}>
                  <span className="flex items-center gap-1 text-[12px] font-medium text-warning">
                    <Crown size={13} /> Owner
                  </span>
                </MemberRow>

                {project.members.map((m) => (
                  <MemberRow key={m.id} user={m.user}>
                    {canManage ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-28">
                          <Select
                            value={m.role}
                            onChange={(v) => changeRole(m.id, v as ProjectRole)}
                            options={ASSIGNABLE_ROLES.map((r) => ({
                              value: r,
                              label: roleLabel(r),
                            }))}
                          />
                        </div>
                        <button
                          onClick={() => removeMember(m.id)}
                          className="rounded px-1.5 py-1 text-[12px] text-faint transition-colors hover:text-danger"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-[12px] capitalize text-faint">
                        {m.role.toLowerCase()}
                      </span>
                    )}
                  </MemberRow>
                ))}

                {project.members.length === 0 && (
                  <p className="px-1 py-3 text-[12px] text-faint">
                    Just you for now.
                    {canManage ? " Add a friend above to collaborate." : ""}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            <Card title="About" icon={<Shield size={14} />}>
              <div className="flex flex-col gap-3 text-[13px]">
                <AboutRow icon={<Crown size={14} />} label="Owner">
                  <span className="flex items-center gap-1.5">
                    <Avatar name={project.owner.name} src={project.owner.avatar} size="xs" />
                    <span className="truncate">{project.owner.name}</span>
                  </span>
                </AboutRow>
                <AboutRow icon={<Shield size={14} />} label="Your role">
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                    {roleLabel(project.role)}
                  </span>
                </AboutRow>
                <AboutRow icon={<Users size={14} />} label="Members">
                  {memberCount}
                </AboutRow>
                <AboutRow icon={<ListTodo size={14} />} label="Tasks">
                  {taskCount}
                </AboutRow>
                <AboutRow icon={<CalendarDays size={14} />} label="Created">
                  {format(new Date(project.createdAt), "MMM d, yyyy")}
                </AboutRow>
              </div>
            </Card>

            {/* Danger zone — owner only, personal space excluded */}
            {isOwner && !project.isPersonal && (
              <Card title="Danger zone" icon={<Trash2 size={14} />} danger>
                <p className="text-[12px] text-muted">
                  Deleting a project removes all its sections, tasks, and history. This can't be
                  undone.
                </p>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-danger/40 px-3 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-danger hover:text-white"
                >
                  <Trash2 size={14} /> Delete project
                </button>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this project?"
        description={`"${project.name}" and everything in it will be permanently deleted. This cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete project"}
        danger
        onConfirm={del}
      />
    </div>
  );
}

function Card({
  title,
  icon,
  action,
  danger,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-elevated shadow-sm",
        danger ? "border-danger/30" : "border-border"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b px-4 py-2.5",
          danger ? "border-danger/20" : "border-border"
        )}
      >
        <h2
          className={cn(
            "flex items-center gap-2 text-[13px] font-semibold",
            danger && "text-danger"
          )}
        >
          {icon && <span className={danger ? "text-danger" : "text-muted"}>{icon}</span>}
          {title}
        </h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function MemberRow({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-2">
      <Avatar name={user.name} src={user.avatar} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{user.name}</p>
        <p className="truncate text-[12px] text-faint">
          {user.username ? `@${user.username}` : user.publicId}
        </p>
      </div>
      {children}
    </div>
  );
}

function AboutRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-muted">
        {icon} {label}
      </span>
      <span className="min-w-0 truncate text-right font-medium">{children}</span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-text/85">{label}</label>
      {children}
    </div>
  );
}
