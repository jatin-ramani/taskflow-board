"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Loader2 } from "lucide-react";

interface Project { id: string; name: string; color: string; description: string | null; status: string; _count: { tasks: number }; members: { user: { id: string; name: string; avatar: string | null } }[]; }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchProjects = async () => {
    try { const r = await fetch("/api/projects"); if (r.ok) setProjects(await r.json()); } catch {} finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
      if (r.ok) { setName(""); setDescription(""); setShowCreate(false); fetchProjects(); }
    } catch {}
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", color: "var(--text-tertiary)" }}><Loader2 size={24} className="animate-spin" /></div>;

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Projects</h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: "14px", marginTop: "4px" }}>{projects.length} project{projects.length !== 1 && "s"}</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ height: "40px", padding: "0 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: "14px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(255,88,74,0.3)", transition: "var(--transition-fast)" }}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <>
          <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "440px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "32px", zIndex: 51, boxShadow: "var(--shadow-xl)" }} className="animate-scale-in">
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px" }}>Create Project</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" autoFocus required
                  style={{ width: "100%", height: "44px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0 14px", fontSize: "14px", color: "var(--text-primary)", outline: "none" }} />
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this project about?" rows={3}
                  style={{ width: "100%", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px", fontSize: "14px", color: "var(--text-primary)", outline: "none", resize: "none" }} />
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ height: "40px", padding: "0 20px", background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "none", borderRadius: "var(--radius-md)", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ height: "40px", padding: "0 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: "14px", fontWeight: 500, cursor: "pointer", boxShadow: "0 4px 12px rgba(255,88,74,0.3)" }}>Create Project</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Project Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--border)", transition: "var(--transition-fast)", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: p.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FolderKanban size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{p._count.tasks} tasks</div>
                </div>
              </div>
              {p.description && <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "12px" }}>{p.description}</p>}
            </div>
          </Link>
        ))}
      </div>

      {projects.length === 0 && !showCreate && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-tertiary)" }}>
          <FolderKanban size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
          <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "8px" }}>No projects yet</div>
          <div style={{ fontSize: "14px", marginBottom: "24px" }}>Create your first project to get started</div>
          <button onClick={() => setShowCreate(true)} style={{ height: "40px", padding: "0 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
            <Plus size={16} style={{ display: "inline", marginRight: "6px" }} /> Create Project
          </button>
        </div>
      )}
    </div>
  );
}
