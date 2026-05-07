"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface TeamMember { id: string; name: string; email: string; avatar: string | null; role: string; createdAt: string; }

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setMembers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const roleColors: Record<string, string> = { ADMIN: "#ff5630", MANAGER: "#ff8b00", MEMBER: "#36b37e" };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", color: "var(--text-tertiary)" }}><Loader2 size={24} className="animate-spin" /></div>;

  return (
    <div style={{ padding: "32px", maxWidth: "800px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Team</h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: "14px", marginTop: "4px" }}>{members.length} member{members.length !== 1 && "s"}</p>
        </div>
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" }}>
        {members.map((m, i) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: i < members.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: m.avatar ? `url(${m.avatar}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                {!m.avatar && getInitials(m.name)}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{m.email}</div>
              </div>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 500, padding: "4px 10px", borderRadius: "var(--radius-full)", background: `${roleColors[m.role]}20`, color: roleColors[m.role] }}>
              {m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
