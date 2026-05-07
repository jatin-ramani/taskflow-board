"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { CheckCircle2, Clock, Plus, ChevronRight, LayoutGrid, Calendar, Users, Settings2, MoreHorizontal, Rocket, BookOpen, Layers, Lock } from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("upcoming");
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const tasks = [
    { id: "1", title: "Task 1", date: "May 6 - 8", project: "Jatin's first...", color: "#ff584a" },
    { id: "2", title: "Task 2", date: "Today - May 11", project: "", color: "#2eb52e" },
  ];

  const learnCards = [
    { title: "Getting started", desc: "Learn the basics and see how TaskFlow helps you get work done.", time: "3 min", icon: <Rocket size={24} />, color: "#fff0f0" },
    { title: "Manage student organizations", desc: "Learn how to organize meetings, events, and projects in TaskFlow.", time: "5 min read", icon: <BookOpen size={24} />, color: "#fff0f0" },
    { title: "Manage projects in TaskFlow", desc: "Plan, organize, and manage your projects effectively.", time: "15 min", icon: <Layers size={24} />, color: "#fff0f0" },
  ];

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", padding: "40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <div style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "4px" }}>{dateStr}</div>
          <h1 style={{ fontSize: "32px", fontWeight: 700, color: "var(--text-primary)" }}>Good morning, {session?.user?.name?.split(" ")[0]}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "4px 12px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px", height: "36px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>My week</span>
            <div style={{ width: "1px", height: "16px", background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <CheckCircle2 size={14} color="var(--success)" /> 0 tasks completed
              <Users size={14} color="var(--text-tertiary)" /> 0 collaborators
            </div>
          </div>
          <button style={{ height: "36px", padding: "0 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--bg-secondary)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <LayoutGrid size={14} /> Customize
          </button>
        </div>
      </div>

      {/* Main Widgets */}
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {/* My Tasks Widget */}
        <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#fff" }}>
                {session?.user?.name ? getInitials(session.user.name) : "JR"}
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>My tasks <Lock size={14} color="var(--text-tertiary)" /></h2>
            </div>
            <button style={{ color: "var(--text-tertiary)" }}><MoreHorizontal size={20} /></button>
          </div>
          
          <div style={{ padding: "0 24px" }}>
            <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--border)" }}>
              {["Upcoming", "Overdue", "Completed"].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab.toLowerCase())} 
                  style={{ 
                    padding: "12px 0", 
                    fontSize: "14px", 
                    fontWeight: activeTab === tab.toLowerCase() ? 600 : 400, 
                    color: activeTab === tab.toLowerCase() ? "var(--text-primary)" : "var(--text-tertiary)", 
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: activeTab === tab.toLowerCase() ? "2px solid var(--text-primary)" : "2px solid transparent", 
                    background: "transparent", 
                    cursor: "pointer" 
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "12px 24px" }}>
            <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", color: "var(--text-tertiary)", fontSize: "13px", background: "transparent", border: "none", cursor: "pointer", marginBottom: "8px" }}>
              <Plus size={16} /> Create task
            </button>
            {tasks.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <CheckCircle2 size={18} color="var(--text-tertiary)" />
                <span style={{ flex: 1, fontSize: "14px" }}>{t.title}</span>
                {t.project && <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", padding: "2px 8px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}><div style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.color }} />{t.project}</div>}
                <span style={{ fontSize: "12px", color: t.date.includes("Today") ? "var(--danger)" : "var(--text-tertiary)" }}>{t.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Learn Section */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Learn TaskFlow</h2>
            <button style={{ color: "var(--text-tertiary)" }}><MoreHorizontal size={20} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {learnCards.map((card, i) => (
              <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ height: "160px", background: card.color, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                  {card.icon}
                </div>
                <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: "4px" }}><Clock size={10} /> {card.time}</span>
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>{card.title}</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: 1.5, marginBottom: "16px" }}>{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
