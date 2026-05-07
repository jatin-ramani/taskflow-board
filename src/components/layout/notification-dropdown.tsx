"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, X, Loader2, Sparkles, UserPlus } from "lucide-react";
import { getInitials, timeAgo } from "@/lib/utils";
import { useToast } from "@/components/layout/toast-provider";
import Link from "next/link";

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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
      }
    } catch (err) {
      console.error("Failed to respond", err);
    } finally {
      setRespondingId(null);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: "36px", 
          height: "36px", 
          borderRadius: "50%", 
          background: isOpen ? "var(--bg-secondary)" : "transparent", 
          border: "none", 
          cursor: "pointer", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          color: isOpen ? "var(--text-primary)" : "var(--text-tertiary)", 
          transition: "var(--transition-fast)",
          position: "relative"
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{ 
            position: "absolute", 
            top: "8px", 
            right: "8px", 
            width: "8px", 
            height: "8px", 
            background: "var(--accent)", 
            borderRadius: "50%", 
            border: "2px solid var(--bg-primary)" 
          }} />
        )}
      </button>

      {isOpen && (
        <div style={{ 
          position: "absolute", 
          right: 0, 
          top: "calc(100% + 8px)", 
          width: "320px", 
          background: "var(--bg-secondary)", 
          border: "1px solid var(--border)", 
          borderRadius: "12px", 
          boxShadow: "var(--shadow-xl)", 
          zIndex: 100, 
          overflow: "hidden" 
        }} className="animate-scale-in">
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", fontWeight: 700 }}>Quick Updates</span>
            <Link href="/notifications" onClick={() => setIsOpen(false)} style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>View all</Link>
          </div>

          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "40px", display: "flex", justifyContent: "center" }}><Loader2 className="animate-spin" size={20} color="var(--text-tertiary)" /></div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
                <Bell size={24} style={{ marginBottom: "8px", opacity: 0.2 }} />
                <p>No new updates</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} style={{ 
                  padding: "12px 16px", 
                  borderBottom: "1px solid var(--border)", 
                  display: "flex", 
                  gap: "12px",
                  background: n.isRead ? "transparent" : "rgba(109, 91, 247, 0.03)"
                }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, flexShrink: 0 }}>
                    {getInitials(n.actor?.name || "TF")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                      <span style={{ fontSize: "10px", color: "var(--text-tertiary)", flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: n.type === "PROJECT_INVITE" ? "8px" : "0" }}>{n.message}</p>
                    
                    {n.type === "PROJECT_INVITE" && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          onClick={() => handleResponse(n.id, "accept")}
                          disabled={respondingId === n.id}
                          style={{ padding: "4px 10px", borderRadius: "4px", background: "var(--accent)", color: "#fff", border: "none", fontSize: "10px", fontWeight: 600, cursor: "pointer" }}
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleResponse(n.id, "reject")}
                          disabled={respondingId === n.id}
                          style={{ padding: "4px 10px", borderRadius: "4px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: "10px", fontWeight: 600, cursor: "pointer" }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Link href="/notifications" onClick={() => setIsOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: "12px", textDecoration: "none", fontWeight: 500 }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
