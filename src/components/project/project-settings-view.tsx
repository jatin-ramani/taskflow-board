"use client";

import { useState, useEffect } from "react";
import { Settings2, Trash2, UserPlus, AlertTriangle, Check, Loader2, Info, Shield, Layout, Users, Flag, MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/layout/toast-provider";

interface ProjectSettingsViewProps {
  projectId: string;
}

const PROJECT_STATUSES = [
  { id: "ON_TRACK", label: "On track", color: "#36b37e", bg: "rgba(54, 179, 126, 0.1)" },
  { id: "AT_RISK", label: "At risk", color: "#ffab00", bg: "rgba(255, 171, 0, 0.1)" },
  { id: "OFF_TRACK", label: "Off track", color: "#ff5630", bg: "rgba(255, 86, 48, 0.1)" },
  { id: "ON_HOLD", label: "On hold", color: "#0065ff", bg: "rgba(0, 101, 255, 0.1)" },
  { id: "COMPLETE", label: "Complete", color: "#36b37e", bg: "rgba(54, 179, 126, 0.2)", icon: Check },
  { id: "DROPPED", label: "Dropped", color: "#6b778c", bg: "rgba(107, 119, 140, 0.1)" },
];

export function ProjectSettingsView({ projectId }: ProjectSettingsViewProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("general");
  
  // Edit State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ON_TRACK");
  
  // Invite State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  
  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      setProject(data);
      setName(data.name);
      setDescription(data.description || "");
      setStatus(data.status || "ON_TRACK");
    } catch (err) {
      console.error("Failed to fetch project", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const handleUpdate = async (updates: any) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates })
      });
      if (res.ok) {
        toast("Project updated successfully", "success");
        fetchProject();
      }
    } catch (err) {
      toast("Failed to update project", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail })
      });
      if (res.ok) {
        toast(`Invitation sent to ${inviteEmail}`, "success");
        setInviteEmail("");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to send invitation", "error");
      }
    } catch (err) {
      toast("An error occurred", "error");
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "delete") return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Project deleted", "info");
        router.push("/dashboard");
      }
    } catch (err) {
      toast("Failed to delete project", "error");
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-tertiary)" }}>
      <Loader2 className="animate-spin" size={24} />
    </div>
  );

  const isOwner = project.ownerId === session?.user?.id;

  const sections = [
    { id: "general", label: "General", icon: Settings2 },
    { id: "status", label: "Status & Health", icon: Flag },
    { id: "team", label: "Invites & Access", icon: UserPlus },
    { id: "leadership", label: "Leadership", icon: Shield },
    { id: "danger", label: "Danger Zone", icon: Trash2, color: "var(--danger)" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", background: "var(--bg-primary)" }}>
      {/* Settings Sidebar */}
      <div style={{ width: "240px", borderRight: "1px solid var(--border)", padding: "24px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "4px",
              border: "none",
              background: activeSection === s.id ? "var(--bg-secondary)" : "transparent",
              color: activeSection === s.id ? (s.color || "var(--text-primary)") : "var(--text-tertiary)",
              fontSize: "14px",
              fontWeight: activeSection === s.id ? 600 : 400,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => { if (activeSection !== s.id) e.currentTarget.style.background = "var(--bg-tertiary)"; }}
            onMouseLeave={(e) => { if (activeSection !== s.id) e.currentTarget.style.background = "transparent"; }}
          >
            <s.icon size={16} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        <div style={{ maxWidth: "700px" }}>
          {activeSection === "general" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>General Settings</h2>
              <p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "32px" }}>Update your project's basic information and appearance.</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>Project Name</label>
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: "4px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                  />
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    style={{ padding: "10px 14px", borderRadius: "4px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", resize: "none" }}
                  />
                </div>

                <button 
                  onClick={() => handleUpdate({ name, description })}
                  disabled={saving}
                  style={{ padding: "10px 24px", borderRadius: "4px", background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === "status" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Project Status</h2>
              <p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "32px" }}>Keep everyone informed about the health of the project.</p>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginBottom: "32px" }}>
                {PROJECT_STATUSES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatus(s.id)}
                    style={{
                      padding: "16px",
                      borderRadius: "4px",
                      border: status === s.id ? `2px solid ${s.color}` : "1px solid var(--border)",
                      background: status === s.id ? s.bg : "var(--bg-secondary)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color }} />
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{s.label}</span>
                      {status === s.id && <Check size={14} style={{ marginLeft: "auto", color: s.color }} />}
                    </div>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => handleUpdate({ status })}
                disabled={saving}
                style={{ padding: "10px 24px", borderRadius: "4px", background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Update Status
              </button>
            </div>
          )}

          {activeSection === "team" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Invite Members</h2>
              <p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "32px" }}>Expand your team and start collaborating.</p>
              
              <form onSubmit={handleInvite} style={{ display: "flex", gap: "12px", marginBottom: "40px" }}>
                <input 
                  type="email"
                  placeholder="team-mate@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={{ flex: 1, padding: "12px 14px", borderRadius: "4px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                />
                <button 
                  type="submit"
                  disabled={inviting}
                  style={{ padding: "0 24px", borderRadius: "4px", background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}
                >
                  {inviting ? "Inviting..." : "Send Invite"}
                </button>
              </form>

              <div style={{ padding: "20px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-secondary)" }}>
                  <Users size={20} />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>Active Members</div>
                    <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{project.members.length + 1} people have access to this project.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "leadership" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Project Leadership</h2>
              <p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "32px" }}>Who's leading the project.</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "var(--bg-secondary)", borderRadius: "4px", border: "1px solid var(--border)" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "4px", background: "var(--warning)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>O</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>{project.owner.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Project Owner • Created on {new Date(project.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {project.members.filter((m: any) => m.role === "ADMIN").map((m: any) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "var(--bg-secondary)", borderRadius: "4px", border: "1px solid var(--border)" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "4px", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>M</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>{m.user.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Manager • Joined on {new Date(m.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "danger" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "var(--danger)" }}>Danger Zone</h2>
              <p style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "32px" }}>Irreversible actions that affect the entire project.</p>
              
              <div style={{ padding: "24px", border: "1px solid rgba(255, 86, 48, 0.2)", borderRadius: "4px", background: "rgba(255, 86, 48, 0.02)" }}>
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>Delete this project</h4>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Once you delete a project, there is no going back. Please be certain.</p>
                </div>
                
                {isOwner ? (
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    style={{ padding: "10px 20px", borderRadius: "4px", background: "var(--danger)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}
                  >
                    Delete Project
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-tertiary)", fontSize: "13px" }}>
                    <AlertTriangle size={14} /> Only the project owner can delete this project.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ width: "100%", maxWidth: "400px", background: "var(--bg-secondary)", borderRadius: "4px", padding: "24px", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)" }}>Delete Project?</h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>This action is irreversible. Please type <strong>delete</strong> to confirm.</p>
            
            <input 
              placeholder="Type 'delete' here"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "4px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", marginBottom: "20px", textAlign: "center" }}
            />

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "4px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button 
                onClick={handleDelete}
                disabled={deleteConfirm !== "delete"}
                style={{ flex: 1, padding: "10px", borderRadius: "4px", border: "none", background: deleteConfirm === "delete" ? "var(--danger)" : "var(--bg-elevated)", color: "#fff", fontWeight: 600, cursor: deleteConfirm === "delete" ? "pointer" : "not-allowed" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
