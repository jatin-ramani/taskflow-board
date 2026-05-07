"use client";

import { useState } from "react";
import { Bell, Bookmark, Archive, AtSign, Plus, Filter, ArrowUpDown, LayoutGrid, Sparkles, X, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { getInitials, timeAgo } from "@/lib/utils";

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState("activity");
  const [showAiSummary, setShowAiSummary] = useState(true);

  const tabs = [
    { id: "activity", label: "Activity", icon: Bell },
    { id: "bookmarks", label: "Bookmarks", icon: AtSign }, // using AtSign as placeholder
    { id: "archive", label: "Archive", icon: Archive },
    { id: "mentioned", label: "@Mentioned", icon: AtSign },
  ];

  const notifications = [
    { id: "1", author: "Yeti", time: "Yesterday at 4:46pm", content: "Inbox is where you get updates, notifications, and messages from your teammates. Send an invite to start collaborating.", title: "Teamwork makes work happen!", unread: true },
  ];

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Inbox</h1>
        <button style={{ fontSize: "13px", padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "transparent", cursor: "pointer" }}>Manage notifications</button>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "24px" }}>
        {tabs.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            style={{ 
              padding: "12px 0", 
              fontSize: "14px", 
              fontWeight: activeTab === tab.id ? 600 : 400, 
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-tertiary)", 
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: activeTab === tab.id ? "2px solid var(--text-primary)" : "2px solid transparent", 
              background: "transparent", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: "8px" 
            }}
          >
            {tab.label}
          </button>
        ))}
        <button style={{ color: "var(--text-tertiary)", background: "transparent", border: "none", cursor: "pointer" }}><Plus size={16} /></button>
      </div>

      {/* Toolbar */}
      <div style={{ padding: "8px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px" }}>
        <button style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer" }}><Filter size={14} /> Filter</button>
        <button style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer" }}><ArrowUpDown size={14} /> Sort: Newest</button>
        <button style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer" }}><LayoutGrid size={14} /> Density: Detailed</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
        {/* AI Summary Banner */}
        {showAiSummary && (
          <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "20px", marginBottom: "24px", position: "relative" }}>
            <button onClick={() => setShowAiSummary(false)} style={{ position: "absolute", right: "12px", top: "12px", color: "var(--text-tertiary)", background: "transparent", border: "none", cursor: "pointer" }}><X size={16} /></button>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
              <div style={{ color: "#ff584a" }}><Sparkles size={20} /></div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>Inbox Summary</h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>Summarize your most important and actionable notifications with TaskFlow AI.</p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <select style={{ background: "transparent", border: "none", fontSize: "12px", color: "var(--text-tertiary)", outline: "none" }}>
                    <option>Timeframe: Past week</option>
                  </select>
                  <button style={{ padding: "6px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--bg-primary)", fontSize: "13px", cursor: "pointer" }}>View summary</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "12px", fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>Yesterday</div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {notifications.map((n) => (
            <div key={n.id} style={{ display: "flex", gap: "16px", padding: "16px", background: "transparent", borderRadius: "var(--radius-md)", transition: "var(--transition-fast)", cursor: "pointer" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#fff", flexShrink: 0 }}>
                {getInitials(n.author)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>{n.title}</span>
                  {n.unread && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent)" }} />}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 500 }}>{n.author}</span>
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{n.time}</span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{n.content}</p>
              </div>
            </div>
          ))}
        </div>

        <button style={{ marginTop: "32px", color: "var(--accent)", fontSize: "13px", background: "transparent", border: "none", cursor: "pointer" }}>Archive all notifications</button>
      </div>
    </div>
  );
}
