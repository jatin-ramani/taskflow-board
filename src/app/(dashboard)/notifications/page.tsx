"use client";

import { useState, useEffect } from "react";
import { Bell, Bookmark, Archive, AtSign, Plus, Filter, ArrowUpDown, LayoutGrid, Sparkles, X, MoreHorizontal, CheckCircle2, Loader2 } from "lucide-react";
import { getInitials, timeAgo } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/layout/toast-provider";

export default function InboxPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("activity");
  const [showAiSummary, setShowAiSummary] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleResponse = async (notificationId: string, action: "accept" | "reject") => {
    setRespondingId(notificationId);
    try {
      const res = await fetch(`/api/notifications/${notificationId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (action === "accept") toast("Invitation accepted!", "success");
      }
    } catch (err) {
      console.error("Failed to respond", err);
    } finally {
      setRespondingId(null);
    }
  };

  const tabs = [
    { id: "activity", label: "Activity", icon: Bell },
    { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
    { id: "archive", label: "Archive", icon: Archive },
    { id: "mentioned", label: "@Mentioned", icon: AtSign },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-primary)" }}>
      <Loader2 className="animate-spin" size={32} color="var(--accent)" />
    </div>
  );

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Updates</h1>
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
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
        {showAiSummary && (
          <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "20px", marginBottom: "24px", position: "relative" }}>
            <button onClick={() => setShowAiSummary(false)} style={{ position: "absolute", right: "12px", top: "12px", color: "var(--text-tertiary)", background: "transparent", border: "none", cursor: "pointer" }}><X size={16} /></button>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
              <div style={{ color: "#ff584a" }}><Sparkles size={20} /></div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>Updates Summary</h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>Summarize your most important and actionable notifications with TaskFlow AI.</p>
                <button style={{ padding: "6px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--bg-primary)", fontSize: "13px", cursor: "pointer" }}>View summary</button>
              </div>
            </div>
          </div>
        )}

        {(!Array.isArray(notifications) || notifications.length === 0) ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "var(--text-tertiary)" }}>
            <Bell size={48} style={{ marginBottom: "16px", opacity: 0.2 }} />
            <p>All caught up! No new updates.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {notifications.map((n) => (
              <div key={n.id} style={{ 
                display: "flex", 
                gap: "16px", 
                padding: "16px", 
                background: n.isRead ? "transparent" : "rgba(109, 91, 247, 0.03)", 
                borderRadius: "var(--radius-md)", 
                border: "1px solid transparent",
                transition: "all 0.2s ease" 
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 600, color: "#fff", flexShrink: 0 }}>
                  {getInitials(n.actor?.name || "TF")}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>{n.title}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{timeAgo(n.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: n.type === "PROJECT_INVITE" ? "12px" : "0" }}>{n.message}</p>
                  
                  {n.type === "PROJECT_INVITE" && (
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button 
                        onClick={() => handleResponse(n.id, "accept")}
                        disabled={respondingId === n.id}
                        style={{ padding: "6px 16px", borderRadius: "6px", background: "var(--accent)", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                      >
                        {respondingId === n.id ? "Accepting..." : "Accept"}
                      </button>
                      <button 
                        onClick={() => handleResponse(n.id, "reject")}
                        disabled={respondingId === n.id}
                        style={{ padding: "6px 16px", borderRadius: "6px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
