"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { User, Mail, Shield, LogOut, Save, Loader2, CheckSquare, Camera, Plus, MapPin, Briefcase, Users, Target, Lock, MoreHorizontal, Clock, Circle } from "lucide-react";
import { getInitials, formatDuration } from "@/lib/utils";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { signOut } from "next-auth/react";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user/stats")
      .then(r => r.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
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
    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: croppedImage }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        await updateSession({ user: { image: updatedUser.avatar } });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div style={{ padding: "40px", color: "var(--text-tertiary)" }}><Loader2 className="animate-spin" /> Loading profile...</div>;

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Profile Header */}
      <div style={{ padding: "40px 40px 24px", display: "flex", alignItems: "flex-start", gap: "32px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: "128px", height: "128px", borderRadius: "50%", background: (session?.user as any)?.avatar || session?.user?.image ? `url(${(session?.user as any)?.avatar || session?.user?.image}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", fontWeight: 700, color: "#fff", border: "2px solid var(--border)" }}>
            {!((session?.user as any)?.avatar || session?.user?.image) && (session?.user?.name ? getInitials(session.user.name) : "?")}
            {uploading && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={32} className="animate-spin" /></div>}
          </div>
          <button onClick={() => fileInputRef.current?.click()} style={{ position: "absolute", bottom: "4px", right: "4px", width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            <Camera size={16} />
          </button>
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarSelect} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <h1 style={{ fontSize: "32px", fontWeight: 700, color: "var(--text-primary)" }}>{session?.user?.name}</h1>
            <div style={{ padding: "4px 10px", background: "var(--success-muted)", color: "var(--success)", borderRadius: "var(--radius-full)", fontSize: "11px", fontWeight: 600 }}>ACTIVE</div>
          </div>
          
          <div style={{ fontSize: "14px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
             <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Mail size={14} /> {session?.user?.email}</span>
             <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Briefcase size={14} /> TaskFlow Member</span>
          </div>

          <div style={{ display: "flex", gap: "32px" }}>
             <div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{stats?.tasksCompleted}</div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tasks Completed</div>
             </div>
             <div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{stats?.projectsCount}</div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Projects</div>
             </div>
             <div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>{formatDuration(stats?.totalTime || 0)}</div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Focus Time</div>
             </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "40px", display: "grid", gridTemplateColumns: "1fr 340px", gap: "32px" }}>
        {/* Left Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <section style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>Active Tasks <Lock size={14} color="var(--text-tertiary)" /></h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {stats?.recentTasks?.length > 0 ? stats.recentTasks.map((t: any) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                  <Circle size={18} color="var(--text-tertiary)" />
                  <span style={{ flex: 1, fontSize: "14px" }}>{t.title}</span>
                  {t.project && <span style={{ fontSize: "11px", padding: "2px 8px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}>{t.project.name}</span>}
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No date"}</span>
                </div>
              )) : <div style={{ color: "var(--text-tertiary)", fontSize: "14px", padding: "20px 0" }}>No active tasks found.</div>}
            </div>
          </section>
        </div>

        {/* Right Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
           <section style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Account Details</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
               <div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px" }}>ROLE</div>
                  <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}><Shield size={14} /> Member</div>
               </div>
               <div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px" }}>LAST LOGIN</div>
                  <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}><Clock size={14} /> Just now</div>
               </div>
            </div>
          </section>

          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ width: "100%", padding: "12px", background: "var(--danger-muted)", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <LogOut size={16} /> Sign out of all devices
          </button>
        </div>
      </div>

      {cropImage && (
        <ImageCropModal 
          image={cropImage} 
          onCropComplete={handleAvatarUpload} 
          onCancel={() => setCropImage(null)} 
        />
      )}
    </div>
  );
}
