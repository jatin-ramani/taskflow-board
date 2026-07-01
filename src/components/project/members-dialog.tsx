"use client";

import { useEffect, useState } from "react";
import { UserPlus, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import type { ProjectMemberDTO, PublicUser, ProjectRole, FriendItem } from "@/types";

const ASSIGNABLE_ROLES: ProjectRole[] = ["ADMIN", "EDITOR", "VIEWER"];
const roleLabel = (r: ProjectRole) => r.charAt(0) + r.slice(1).toLowerCase();

export function MembersDialog({
  open,
  onOpenChange,
  projectId,
  owner,
  members,
  myRole,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  owner: PublicUser;
  members: ProjectMemberDTO[];
  myRole: ProjectRole;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<ProjectRole>("EDITOR");
  const [busy, setBusy] = useState(false);

  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  useEffect(() => {
    if (!open) return;
    fetch("/api/friends")
      .then((r) => (r.ok ? r.json() : []))
      .then(setFriends)
      .catch(() => {});
  }, [open]);

  const inProject = new Set([owner.id, ...members.map((m) => m.user.id)]);
  const addable = friends.filter((f) => !inProject.has(f.user.id));

  function after(res: Response, okMsg: string) {
    if (res.ok) {
      toast(okMsg, "success");
      onChanged();
      refreshSidebar();
    } else {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Members"
          description="Share this project with friends and set their access."
        />

        <div className="max-h-[62vh] overflow-y-auto p-4">
          {/* Add a friend */}
          {canManage && (
            <div className="mb-4 rounded-lg border border-border bg-surface/40 p-3">
              <p className="mb-2 text-[12px] font-medium text-muted">Add a friend</p>
              {addable.length === 0 ? (
                <p className="text-[12px] text-faint">
                  {friends.length === 0
                    ? "Add friends first to share projects with them."
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

          {/* Owner */}
          <div className="flex flex-col gap-0.5">
            <Row user={owner}>
              <span className="flex items-center gap-1 text-[12px] font-medium text-warning">
                <Crown size={13} /> Owner
              </span>
            </Row>

            {members.map((m) => (
              <Row key={m.id} user={m.user}>
                {canManage ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-28">
                      <Select
                        value={m.role}
                        onChange={(v) => changeRole(m.id, v as ProjectRole)}
                        options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))}
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
              </Row>
            ))}

            {members.length === 0 && (
              <p className="px-1 py-3 text-[12px] text-faint">
                Just you for now. Add a friend above to collaborate.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ user, children }: { user: PublicUser; children: React.ReactNode }) {
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
