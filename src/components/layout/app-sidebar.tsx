"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CheckSquare,
  Inbox,
  Target,
  Users,
  MessageSquare,
  Hash,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";
import type { ProjectSummary } from "@/types";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/inbox", label: "Inbox", icon: Inbox, badge: "unread" as const },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

// Other components can ask the sidebar to refresh its badges/projects.
export const SIDEBAR_REFRESH_EVENT = "taskflow:sidebar-refresh";
export function refreshSidebar() {
  window.dispatchEvent(new Event(SIDEBAR_REFRESH_EVENT));
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [unread, setUnread] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const createRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [pRes, nRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/notifications"),
      ]);
      if (pRes.ok) setProjects(await pRes.json());
      if (nRes.ok) setUnread((await nRes.json()).unreadCount ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(SIDEBAR_REFRESH_EVENT, load);
    return () => window.removeEventListener(SIDEBAR_REFRESH_EVENT, load);
  }, [load]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    setCreating(false);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const project = await res.json();
      await load();
      router.push(`/projects/${project.id}`);
    }
  }

  function startCreating() {
    setCreating(true);
    setTimeout(() => createRef.current?.focus(), 0);
  }

  return (
    <aside className="flex h-screen w-[244px] shrink-0 flex-col border-r border-border bg-elevated">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
          <CheckSquare size={14} className="text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight">TaskFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2.5">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-surface text-text"
                  : "text-muted hover:bg-surface hover:text-text"
              )}
            >
              <Icon size={16} className={active ? "text-text" : "text-faint"} />
              <span className="flex-1">{item.label}</span>
              {item.badge === "unread" && unread > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Projects */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col px-2.5">
        <div className="flex items-center justify-between px-2.5 pb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Projects
          </p>
          <button
            onClick={startCreating}
            className="flex h-5 w-5 items-center justify-center rounded text-faint transition-colors hover:bg-surface hover:text-text"
            aria-label="New project"
          >
            <Plus size={14} />
          </button>
        </div>

        {creating && (
          <form onSubmit={createProject} className="px-1 pb-1">
            <input
              ref={createRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => !newName.trim() && setCreating(false)}
              onKeyDown={(e) => e.key === "Escape" && setCreating(false)}
              placeholder="Project name…"
              className="h-8 w-full rounded-md border border-accent bg-surface px-2.5 text-[13px] outline-none ring-2 ring-accent-soft placeholder:text-faint"
            />
          </form>
        )}

        <div className="flex flex-col gap-0.5 overflow-y-auto">
          {projects.map((p) => {
            const href = `/projects/${p.id}`;
            const active = isActive(href);
            return (
              <Link
                key={p.id}
                href={href}
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
                  active
                    ? "bg-surface text-text"
                    : "text-muted hover:bg-surface hover:text-text"
                )}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                  style={{ background: `${p.color}22` }}
                >
                  <Hash size={11} style={{ color: p.color }} />
                </span>
                <span className="flex-1 truncate">{p.name}</span>
              </Link>
            );
          })}
          {projects.length === 0 && (
            <p className="px-2.5 py-1 text-[12px] text-faint">No projects yet</p>
          )}
        </div>
      </div>

      {/* User */}
      <div className="border-t border-border p-2.5">
        <UserMenu />
      </div>
    </aside>
  );
}
