"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Home, CheckSquare, BarChart3, Bell, Users, Plus, ChevronLeft, ChevronRight, Settings, Search } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";

interface SidebarProps { collapsed: boolean; onToggle: () => void; }
interface ProjectItem { id: string; name: string; color: string; }

const mainNav = [
  { href: "/my-tasks", icon: Home, label: "My Tasks" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");

  const fetchProjects = useCallback(async () => {
    try { const r = await fetch("/api/projects"); if (r.ok) setProjects(await r.json()); } catch {}
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    try {
      const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: projectName }) });
      if (r.ok) { setProjectName(""); setShowCreate(false); fetchProjects(); }
    } catch {}
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "10px",
    padding: collapsed ? "10px 0" : "8px 12px", justifyContent: collapsed ? "center" : "flex-start",
    borderRadius: "var(--radius-md)", color: active ? "var(--text-primary)" : "var(--text-secondary)",
    background: active ? "var(--sidebar-active)" : "transparent", textDecoration: "none",
    fontSize: "14px", fontWeight: active ? 500 : 400, transition: "var(--transition-fast)", marginBottom: "2px",
  });

  return (
    <aside style={{ width: collapsed ? "60px" : "260px", background: "var(--sidebar-bg)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", transition: "width var(--transition-base)", overflow: "hidden", flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: collapsed ? "16px 12px" : "16px 20px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", borderBottom: "1px solid var(--border)", height: "60px" }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CheckSquare size={18} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: "16px" }}>TaskFlow</span>
          </div>
        )}
        <button onClick={onToggle} style={{ width: "28px", height: "28px", borderRadius: "var(--radius-sm)", background: "var(--bg-tertiary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", transition: "var(--transition-fast)", flexShrink: 0 }} title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ width: "100%", height: "36px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "8px", padding: "0 12px", color: "var(--text-tertiary)", fontSize: "13px" }}>
            <Search size={14} /> Search...
          </div>
        </div>
      )}

      {/* Main Nav */}
      <nav style={{ padding: "4px 8px" }}>
        {mainNav.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} style={navLinkStyle(isActive(href))}>
            <Icon size={18} />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      <div style={{ height: "1px", background: "var(--border)", margin: "8px 16px" }} />

      {/* Projects */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 8px" }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Projects</span>
            <button onClick={() => setShowCreate(!showCreate)} style={{ width: "22px", height: "22px", borderRadius: "4px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }} title="New Project"><Plus size={14} /></button>
          </div>
        )}

        {showCreate && !collapsed && (
          <form onSubmit={createProject} style={{ padding: "4px 12px 8px" }}>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name..." autoFocus
              style={{ width: "100%", height: "32px", background: "var(--bg-primary)", border: "1px solid var(--accent)", borderRadius: "4px", padding: "0 10px", fontSize: "13px", color: "var(--text-primary)", outline: "none" }}
              onKeyDown={(e) => { if (e.key === "Escape") { setShowCreate(false); setProjectName(""); } }} />
          </form>
        )}

        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} style={navLinkStyle(pathname.startsWith(`/projects/${p.id}`))}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color || "var(--accent)", flexShrink: 0 }} />
            {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>}
          </Link>
        ))}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "8px" }}>
        <Link href="/team" style={navLinkStyle(isActive("/team"))}><Users size={18} />{!collapsed && <span>Team</span>}</Link>
        <Link href="/profile" style={navLinkStyle(isActive("/profile"))}><Settings size={18} />{!collapsed && <span>Settings</span>}</Link>
      </div>

      {/* User */}
      <div style={{ borderTop: "1px solid var(--border)", padding: collapsed ? "12px 8px" : "12px 16px", display: "flex", alignItems: "center", gap: "10px", justifyContent: collapsed ? "center" : "flex-start" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: session?.user?.avatar ? `url(${session.user.avatar}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#fff", flexShrink: 0 }}>
          {!session?.user?.avatar && (session?.user?.name ? getInitials(session.user.name) : "?")}
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.name || "User"}</div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.email}</div>
          </div>
        )}
      </div>
    </aside>
  );
}
