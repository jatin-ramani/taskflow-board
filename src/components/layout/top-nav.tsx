"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Menu, Bell, LogOut, User, ChevronRight, HelpCircle, Sparkles, Calendar, Settings, Plus, UserPlus, ChevronDown, Camera, Loader2 } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { ImageCropModal } from "../ui/image-crop-modal";
import Link from "next/link";

export function TopNav({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { data: session, update: updateSession } = useSession();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "projects" && parts[1]) {
      const projectId = parts[1];
      fetch(`/api/projects/${projectId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.name) setProjectName(data.name);
        })
        .catch(err => console.error("Failed to fetch project name", err));
    } else {
      setProjectName(null);
    }
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCropImage(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAvatarUpload = async (croppedImage: string) => {
    setCropImage(null);
    setUploading(true);
    setUploadProgress(10);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => prev < 90 ? prev + 10 : prev);
    }, 200);

    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: croppedImage }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUploadProgress(100);
        await updateSession({ user: { image: updatedUser.avatar } });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((p, i) => {
      if (parts[0] === "projects" && i === 1 && projectName) {
        return projectName;
      }
      return p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " ");
    });
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
          <Bell size={18} />
        </button>

        {/* User Menu */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px", borderRadius: "var(--radius-lg)", background: "transparent", border: "none", cursor: "pointer", transition: "var(--transition-fast)" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: (session?.user as any)?.avatar || session?.user?.image ? `url(${(session?.user as any)?.avatar || session?.user?.image}) center/cover` : "var(--accent)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#fff", position: "relative" }}>
              {!((session?.user as any)?.avatar || session?.user?.image) && (session?.user?.name ? getInitials(session.user.name) : "?")}
              <div style={{ position: "absolute", bottom: "-1px", right: "-1px", width: "10px", height: "10px", borderRadius: "50%", background: "#36b37e", border: "2px solid var(--bg-primary)" }} />
            </div>
            <ChevronDown size={14} color="var(--text-tertiary)" />
          </button>

          {showUserMenu && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "300px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", overflow: "hidden", zIndex: 100 }} className="animate-scale-in">
              {/* User Identity */}
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ position: "relative", cursor: "pointer", marginBottom: "12px" }} onClick={() => fileInputRef.current?.click()}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: (session?.user as any)?.avatar || session?.user?.image ? `url(${(session?.user as any)?.avatar || session?.user?.image}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 600, color: "#fff", border: "2px solid var(--border)" }}>
                    {!((session?.user as any)?.avatar || session?.user?.image) && (session?.user?.name ? getInitials(session.user.name) : "?")}
                  </div>
                  {uploading && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      <Loader2 size={16} className="animate-spin" />
                      <span style={{ fontSize: "10px", marginTop: "4px" }}>{uploadProgress}%</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--bg-elevated)", borderRadius: "50%", padding: "6px", border: "1px solid var(--border)" }}><Camera size={12} /></div>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarSelect} />
                </div>
                <div style={{ width: "100%", minWidth: 0 }}>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>{session?.user?.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.email}</div>
                </div>
              </div>

              {/* Menu Items */}
              <div style={{ padding: "8px" }}>
                <Link href="/profile" onClick={() => setShowUserMenu(false)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", textDecoration: "none", fontSize: "14px", transition: "var(--transition-fast)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <User size={16} /> My Profile
                </Link>
                <button style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer", fontSize: "14px", transition: "var(--transition-fast)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <Settings size={16} /> Workspace Settings
                </button>

                <div style={{ height: "1px", background: "var(--border)", margin: "8px 4px" }} />

                <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "var(--radius-md)", color: "var(--danger)", background: "transparent", border: "none", cursor: "pointer", fontSize: "14px", transition: "var(--transition-fast)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--danger-muted)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <LogOut size={16} /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {cropImage && (
        <ImageCropModal 
          image={cropImage} 
          onCropComplete={handleAvatarUpload} 
          onCancel={() => setCropImage(null)} 
        />
      )}
    </header>
  );
}
