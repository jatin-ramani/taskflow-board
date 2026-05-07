"use client";

import { useState, useEffect } from "react";
import { User, Mail, Shield, MoreHorizontal, UserPlus, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useSession } from "next-auth/react";

import { useToast } from "@/components/layout/toast-provider";

interface ProjectTeamViewProps {
  projectId: string;
}

export function ProjectTeamView({ projectId }: ProjectTeamViewProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      // Combine owner and members for display
      const allMembers = [
        { 
          id: `owner-${data.owner.id}`, 
          user: data.owner, 
          role: "OWNER", 
          isOwner: true 
        },
        ...data.members
          .filter((m: any) => m.user.id !== data.owner.id)
          .map((m: any) => ({ 
            id: m.id, 
            user: m.user, 
            role: m.role, 
            isOwner: false 
          }))
      ];
      setMembers(allMembers);
    } catch (err) {
      console.error("Failed to fetch members", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  const updateRole = async (memberId: string, newRole: string, isOwner: boolean) => {
    if (isOwner) return; // Cannot change owner role here
    
    setUpdatingId(memberId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        toast("Role updated successfully", "success");
        fetchMembers();
      }
    } catch (err) {
      toast("Failed to update role", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "DELETE"
      });
      if (res.ok) fetchMembers();
    } catch (err) {
      console.error("Failed to remove member", err);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-tertiary)" }}>
      <Loader2 className="animate-spin" size={24} />
    </div>
  );

  return (
    <div style={{ padding: "32px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Project Team</h2>
          <p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>Manage who has access to this project and their permissions.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
        {members.map((member) => (
          <div key={member.id} style={{ 
            background: "var(--bg-secondary)", 
            border: "1px solid var(--border)", 
            borderRadius: "4px", 
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            position: "relative",
            transition: "all 0.2s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ 
                width: "48px", 
                height: "48px", 
                borderRadius: "4px", 
                background: member.user.avatar || member.user.image ? `url(${member.user.avatar || member.user.image}) center/cover` : "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 600,
                color: "#fff",
                border: "1px solid var(--border)"
              }}>
                {!(member.user.avatar || member.user.image) && getInitials(member.user.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  {member.user.name}
                  {member.isOwner && <ShieldCheck size={14} color="var(--warning)" />}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Mail size={12} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.user.email}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Shield size={14} color="var(--text-tertiary)" />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>{member.role}</span>
              </div>

              {!member.isOwner && (
                <select 
                  value={member.role}
                  disabled={updatingId === member.id}
                  onChange={(e) => updateRole(member.id, e.target.value, false)}
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              )}
            </div>

            {!member.isOwner && (
              <button 
                onClick={() => removeMember(member.id)}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  padding: "6px",
                  borderRadius: "6px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}
              >
                <MoreHorizontal size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
