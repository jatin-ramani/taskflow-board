"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Home, CheckSquare, Bell, Users, Plus, ChevronLeft, ChevronRight, Settings, Search, BarChart3, Target, Layout, Briefcase, ChevronDown, Loader2, FileText } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";

interface SidebarProps { collapsed: boolean; onToggle: () => void; }
interface ProjectItem { id: string; name: string; color: string; }

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const fetchProjects = useCallback(async () => {
    try { const r = await fetch("/api/projects"); if (r.ok) setProjects(await r.json()); } catch {}
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Search logic
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (r.ok) setSearchResults(await r.json());
      } catch {} finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search results on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const sectionHeaderStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between", 
    padding: "16px 12px 8px", fontSize: "11px", fontWeight: 600, 
    color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px"
  };

  return (
    <aside style={{ width: collapsed ? "60px" : "260px", background: "var(--sidebar-bg)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", transition: "width var(--transition-base)", overflow: "hidden", flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: collapsed ? "16px 12px" : "16px 20px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", height: "60px" }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "var(--radius-sm)", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CheckSquare size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: "15px" }}>TaskFlow</span>
          </div>
        )}
        <button onClick={onToggle} style={{ width: "24px", height: "24px", borderRadius: "var(--radius-sm)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 8px" }}>
        {/* Search Bar */}
        {!collapsed && (
          <div ref={searchRef} style={{ padding: "8px 12px", position: "relative" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..."
                style={{ width: "100%", height: "34px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0 10px 0 32px", fontSize: "13px", outline: "none", color: "var(--text-primary)" }} />
              {isSearching && <Loader2 size={12} className="animate-spin" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />}
            </div>

            {/* Search Results Dropdown */}
            {searchResults && (
              <div style={{ position: "absolute", left: "12px", right: "12px", top: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-xl)", zIndex: 50, marginTop: "4px", padding: "8px", maxHeight: "300px", overflowY: "auto" }}>
                {searchResults.projects.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", padding: "4px 8px" }}>Projects</div>
                    {searchResults.projects.map((p: any) => (
                      <button key={p.id} onClick={() => { router.push(`/projects/${p.id}`); setSearchQuery(""); setSearchResults(null); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "4px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <Layout size={14} color={p.color} />
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.tasks.length > 0 && (
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", padding: "4px 8px" }}>Tasks</div>
                    {searchResults.tasks.map((t: any) => (
                      <button key={t.id} onClick={() => { router.push(`/projects/${t.projectId}?task=${t.id}`); setSearchQuery(""); setSearchResults(null); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "4px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <CheckSquare size={14} color="var(--text-tertiary)" />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{t.title}</span>
                          <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>{t.project.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.projects.length === 0 && searchResults.tasks.length === 0 && (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "12px" }}>No results found</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Nav */}
        <nav>
          <Link href="/dashboard" style={navLinkStyle(isActive("/dashboard"))}><Home size={18} />{!collapsed && <span>Home</span>}</Link>
          <Link href="/my-tasks" style={navLinkStyle(isActive("/my-tasks"))}><CheckSquare size={18} />{!collapsed && <span>My tasks</span>}</Link>
        </nav>

        {!collapsed && (
          <>
            <div style={sectionHeaderStyle}>
              <span>Projects</span>
              <button onClick={() => setShowCreate(!showCreate)} style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}><Plus size={14} /></button>
            </div>
            {showCreate && (
              <form onSubmit={createProject} style={{ padding: "4px 12px 8px" }}>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name..." autoFocus
                  style={{ width: "100%", height: "32px", background: "var(--bg-primary)", border: "1px solid var(--accent)", borderRadius: "4px", padding: "0 10px", fontSize: "13px", color: "var(--text-primary)", outline: "none" }} />
              </form>
            )}
            <nav>
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} style={navLinkStyle(pathname.startsWith(`/projects/${p.id}`))}>
                  <Layout size={18} />
                  <span>{p.name}</span>
                </Link>
              ))}
            </nav>

            <div style={sectionHeaderStyle}>Team <ChevronDown size={14} /></div>
            <nav>
              <Link href="/team" style={navLinkStyle(isActive("/team"))}><div style={{ width: "18px", height: "18px", borderRadius: "4px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>M</div><span>My workspace</span></Link>
            </nav>
          </>
        )}
      </div>
    </aside>
  );
}
