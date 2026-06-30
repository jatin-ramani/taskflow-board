"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Target,
  Users,
  MessageSquare,
  Inbox,
  Hash,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";
import type { ProjectSummary } from "@/types";

const NAV = [
  { href: "/home", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare, badge: "messages" as const },
  { href: "/inbox", label: "Inbox", icon: Inbox, badge: "inbox" as const },
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
  const [msgUnread, setMsgUnread] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const createRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [pRes, nRes, cRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/notifications"),
        fetch("/api/conversations"),
      ]);
      if (pRes.ok) setProjects(await pRes.json());
      if (nRes.ok) setUnread((await nRes.json()).unreadCount ?? 0);
      if (cRes.ok) {
        const convos: { unreadCount: number }[] = await cRes.json();
        setMsgUnread(convos.reduce((n, c) => n + (c.unreadCount || 0), 0));
      }
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

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2.5 pt-3">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const count =
            item.badge === "inbox" ? unread : item.badge === "messages" ? msgUnread : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface hover:text-text"
              )}
            >
              {active && (
                <span className="absolute -left-2.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <Icon
                size={17}
                className={active ? "text-accent" : "text-faint group-hover:text-text"}
              />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Projects quick list */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col px-2.5">
        <div className="mx-2.5 mb-2 h-px bg-border" />
        <div className="flex items-center justify-between px-2.5 pb-1.5">
          <Link
            href="/projects"
            className="text-[11px] font-semibold uppercase tracking-wider text-faint transition-colors hover:text-muted"
          >
            Projects
          </Link>
          <button
            onClick={() => {
              setCreating(true);
              setTimeout(() => createRef.current?.focus(), 0);
            }}
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
              className="h-8 w-full rounded-md border border-accent bg-elevated px-2.5 text-[13px] outline-none ring-2 ring-accent-soft placeholder:text-faint"
            />
          </form>
        )}

        <div className="flex flex-col gap-0.5 overflow-y-auto pb-3">
          {projects.map((p) => {
            const href = `/projects/${p.id}`;
            const active = pathname === href;
            return (
              <Link
                key={p.id}
                href={href}
                className={cn(
                  "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-surface hover:text-text"
                )}
              >
                {active && (
                  <span className="absolute -left-2.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
                )}
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  style={{ background: `${p.color}22` }}
                >
                  <Hash size={12} style={{ color: p.color }} />
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

      {/* User menu (desktop sidebar bottom) */}
      <div className="shrink-0 border-t border-border p-2">
        <UserMenu />
      </div>
    </aside>
  );
}
