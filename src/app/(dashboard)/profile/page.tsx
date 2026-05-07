"use client";

import { useSession, update as updateSession } from "next-auth/react";
import { useState, useRef } from "react";
import { User, Mail, Shield, LogOut, Save, Loader2, CheckSquare, Camera, Plus, MapPin, Briefcase, Users, Target, Lock, MoreHorizontal } from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (res.ok) await updateSession();
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Profile Header */}
      <div style={{ padding: "40px 40px 24px", display: "flex", alignItems: "flex-start", gap: "24px" }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: session?.user?.avatar ? `url(${session.user.avatar}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", fontWeight: 700, color: "#fff" }}>
            {!session?.user?.avatar && (session?.user?.name ? getInitials(session.user.name) : "?")}
            {uploading && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={32} className="animate-spin" /></div>}
          </div>
          <button onClick={() => fileInputRef.current?.click()} style={{ position: "absolute", bottom: "4px", right: "4px", width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            <Camera size={16} />
          </button>
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <h1 style={{ fontSize: "32px", fontWeight: 700, color: "var(--text-primary)" }}>{session?.user?.name}</h1>
            <Shield size={20} color="var(--text-tertiary)" />
          </div>
          
          <button style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "16px" }}>
            <MapPin size={14} /> Set out of office
          </button>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <button style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}><Plus size={16} /> Add job title</button>
            <button style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}><Plus size={16} /> Add team or dept.</button>
            <button style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}><Plus size={16} /> Add about me</button>
          </div>

          <button style={{ marginTop: "24px", padding: "8px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
            Edit profile
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div style={{ padding: "0 40px 40px", display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
        {/* Left Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* My Tasks */}
          <section style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>My tasks <Lock size={14} color="var(--text-tertiary)" /></h2>
              <button style={{ fontSize: "12px", padding: "4px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "transparent", cursor: "pointer" }}>View all tasks</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { title: "Task 1", date: "May 6 - 8", project: "Jatin's first..." },
                { title: "Task 2", date: "Today - May 11", project: "" }
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <CheckSquare size={18} color="var(--text-tertiary)" />
                  <span style={{ flex: 1, fontSize: "14px" }}>{t.title}</span>
                  {t.project && <span style={{ fontSize: "11px", padding: "2px 8px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}>{t.project}</span>}
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{t.date}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Projects */}
          <section style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>My recent projects</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Briefcase size={16} /></div>
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>Jatin's first project</span>
              <div style={{ display: "flex", alignItems: "center", gap: "-8px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600, color: "#fff" }}>JR</div>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--bg-tertiary)", border: "2px solid var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={12} /></div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Frequent Collaborators */}
          <section style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>Frequent collaborators <Lock size={14} color="var(--text-tertiary)" /></h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Plus size={18} /></div>
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Invite teammates</span>
            </div>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--bg-tertiary)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>This space is for your frequent collaborators.</p>
            </div>
          </section>

          {/* My Goals */}
          <section style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>My goals <Lock size={14} color="var(--text-tertiary)" /></h2>
              <button style={{ fontSize: "11px", padding: "4px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "transparent", cursor: "pointer" }}>Create goal</button>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>You don't own any goals yet</p>
            <div style={{ height: "1px", background: "var(--border)", margin: "16px 0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Target size={18} color="var(--success)" />
              <div>
                <div style={{ width: "140px", height: "6px", background: "var(--bg-tertiary)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: "85%", height: "100%", background: "var(--success)" }} />
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>On track (85%)</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
