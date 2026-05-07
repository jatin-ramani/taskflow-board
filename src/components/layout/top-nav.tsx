"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Menu, Bell, LogOut, User, ChevronRight, HelpCircle, Sparkles, Calendar, Settings, Plus, UserPlus, ChevronDown, Camera, Loader2 } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export function TopNav({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { data: session, update: updateSession } = useSession();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/user/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: base64 }),
        });
        if (res.ok) {
          await updateSession();
        }
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " "));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header style={{ height: "60px", background: "var(--bg-primary)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button onClick={onToggleSidebar} style={{ width: "32px", height: "32px", borderRadius: "var(--radius-md)", background: "transparent", border: "none", cursor: "pointer", display: "none", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
          <Menu size={20} />
        </button>
        <nav style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {i > 0 && <ChevronRight size={14} color="var(--text-tertiary)" />}
              <span style={{ fontSize: "14px", fontWeight: i === breadcrumbs.length - 1 ? 600 : 400, color: i === breadcrumbs.length - 1 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button style={{ width: "36px", height: "36px", borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", transition: "var(--transition-fast)" }}>
          <HelpCircle size={18} />
        </button>

        <button style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--bg-tertiary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff584a", transition: "var(--transition-fast)" }}>
          <Sparkles size={18} fill="#ff584a" />
        </button>

        <button style={{ width: "36px", height: "36px", borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", position: "relative" }}>
          <Bell size={18} />
        </button>

        {/* User Menu */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px", borderRadius: "var(--radius-lg)", background: "transparent", border: "none", cursor: "pointer", transition: "var(--transition-fast)" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: session?.user?.avatar ? `url(${session.user.avatar}) center/cover` : "var(--accent)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#fff", position: "relative" }}>
              {!session?.user?.avatar && (session?.user?.name ? getInitials(session.user.name) : "?")}
              <div style={{ position: "absolute", bottom: "-1px", right: "-1px", width: "10px", height: "10px", borderRadius: "50%", background: "#e67e22", border: "2px solid var(--bg-primary)" }} />
            </div>
            <ChevronDown size={14} color="var(--text-tertiary)" />
          </button>

          {showUserMenu && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "320px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", overflow: "hidden", zIndex: 100 }} className="animate-scale-in">
              {/* Trial Banner */}
              <div style={{ padding: "12px 16px", background: "#fffcf0", borderBottom: "1px solid #f9f1d2", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#856404" }}>14 days left in trial. <Link href="#" style={{ color: "#856404", textDecoration: "underline" }}>Learn more</Link></span>
              </div>

              {/* User Identity */}
              <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ position: "relative", cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: session?.user?.avatar ? `url(${session.user.avatar}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 600, color: "#fff" }}>
                    {!session?.user?.avatar && (session?.user?.name ? getInitials(session.user.name) : "?")}
                    {uploading && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={16} className="animate-spin" /></div>}
                  </div>
                  <div style={{ position: "absolute", bottom: -2, right: -2, background: "var(--bg-secondary)", borderRadius: "50%", padding: "4px", border: "1px solid var(--border)" }}><Camera size={10} /></div>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    {session?.user?.name}
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e67e22" }} />
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.email}</div>
                </div>
              </div>

              {/* Menu Items */}
              <div style={{ padding: "6px" }}>
                <button style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", background: "transparent", border: "1px solid var(--border)", cursor: "pointer", fontSize: "13px", margin: "6px 0" }}>
                  <Calendar size={16} /> Set out of office
                </button>

                <div style={{ height: "1px", background: "var(--border)", margin: "6px 0" }} />

                {[
                  { icon: <Settings size={16} />, label: "Admin console" },
                  { icon: <Plus size={16} />, label: "New workspace" },
                  { icon: <UserPlus size={16} />, label: "Invite to Asana" },
                ].map((item, idx) => (
                  <button key={idx} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer", fontSize: "13px" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    {item.icon} {item.label}
                  </button>
                ))}

                <div style={{ height: "1px", background: "var(--border)", margin: "6px 0" }} />

                <Link href="/profile" onClick={() => setShowUserMenu(false)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", textDecoration: "none", fontSize: "13px" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <User size={16} /> Profile
                </Link>
                <button style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer", fontSize: "13px" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <Settings size={16} /> Settings
                </button>
                <button style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer", fontSize: "13px" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <Plus size={16} /> Add another account
                </button>

                <div style={{ height: "1px", background: "var(--border)", margin: "6px 0" }} />

                <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer", fontSize: "13px" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <LogOut size={16} /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
