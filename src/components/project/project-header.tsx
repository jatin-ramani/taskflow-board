import { useState, useRef, useEffect } from "react";
import { List, Kanban, Calendar, LayoutDashboard, FileText, Plus, Filter, ArrowUpDown, Layers, Settings2, Search, Check, Clock, User, Calendar as CalendarIcon, Type, ThumbsUp } from "lucide-react";

interface ProjectHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  projectId?: string;
}

export function ProjectHeader({ activeTab, onTabChange, projectId }: ProjectHeaderProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const tabs = [
    { id: "list", label: "List", icon: List },
    { id: "board", label: "Board", icon: Kanban },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "completed", label: "Completed", icon: Check },
    { id: "favorites", label: "Favorites", icon: ThumbsUp },
    { id: "files", label: "Files", icon: FileText },
  ];

  const sortOptions = [
    { id: "start-date", label: "Start date", icon: CalendarIcon },
    { id: "due-date", label: "Due date", icon: CalendarIcon },
    { id: "created-by", label: "Created by", icon: User },
    { id: "created-on", label: "Created on", icon: Clock },
    { id: "modified-on", label: "Last modified on", icon: Clock },
    { id: "completed-on", label: "Completed on", icon: Clock },
    { id: "likes", label: "Likes", icon: ThumbsUp },
    { id: "alphabetical", label: "Alphabetical", icon: Type },
  ];

  const filterOptions = [
    { id: "incomplete", label: "Incomplete tasks", icon: Check },
    { id: "completed", label: "Completed tasks", icon: Check },
    { id: "due-this-week", label: "Due this week", icon: CalendarIcon },
    { id: "due-next-week", label: "Due next week", icon: CalendarIcon },
  ];

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      background: "var(--bg-primary)", 
      borderBottom: "1px solid var(--border)",
      flexShrink: 0
    }}>
      {/* Tabs Row */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: "0 24px",
        height: "48px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", height: "100%" }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0 12px",
                  height: "100%",
                  background: "transparent",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontSize: "14px",
                  fontWeight: isActive ? 500 : 400,
                  cursor: "pointer",
                  transition: "var(--transition-fast)",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-secondary)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-tertiary)"; }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
          <button style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            background: "transparent",
            border: "none",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            marginLeft: "4px"
          }}>
            <Plus size={16} />
          </button>
        </div>

        {/* Right Side Actions */}
        <div ref={menuRef} style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
          {/* Filter */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setActiveMenu(activeMenu === "filter" ? null : "filter")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "6px",
                background: activeMenu === "filter" ? "var(--bg-secondary)" : "transparent",
                border: "none",
                color: activeMenu === "filter" ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "13px",
                cursor: "pointer",
                transition: "var(--transition-fast)",
              }}
            >
              <Filter size={14} />
              Filter
            </button>
            
            {activeMenu === "filter" && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "280px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", padding: "12px", zIndex: 100 }} className="animate-scale-in">
                <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  Filters
                  <button style={{ fontSize: "12px", color: "var(--text-tertiary)", background: "transparent", border: "none", cursor: "pointer" }}>Clear</button>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: "8px" }}>Quick filters</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {filterOptions.map((opt) => (
                      <button key={opt.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "var(--radius-full)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer", transition: "var(--transition-fast)" }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--text-tertiary)"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}>
                        <opt.icon size={12} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px", borderRadius: "6px", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer", fontSize: "13px" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <Plus size={14} /> Add filter
                </button>
              </div>
            )}
          </div>

          {/* Sort */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setActiveMenu(activeMenu === "sort" ? null : "sort")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "6px",
                background: activeMenu === "sort" ? "var(--bg-secondary)" : "transparent",
                border: "none",
                color: activeMenu === "sort" ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "13px",
                cursor: "pointer",
                transition: "var(--transition-fast)",
              }}
            >
              <ArrowUpDown size={14} />
              Sort
            </button>

            {activeMenu === "sort" && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "200px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", overflow: "hidden", zIndex: 100 }} className="animate-scale-in">
                <div style={{ padding: "4px" }}>
                  {sortOptions.map((opt) => (
                    <button key={opt.id} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "6px", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", transition: "var(--transition-fast)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
                      <opt.icon size={14} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "6px", background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <Layers size={14} /> Group
          </button>

          <div style={{ width: "1px", height: "16px", background: "var(--border)", margin: "0 4px" }} />
          
          <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "6px", background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <Settings2 size={14} /> Options
          </button>
        </div>
      </div>
    </div>
  );
}
