"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  CheckSquare,
  Hash,
  Users,
  LogOut,
  User as UserIcon,
  Loader2,
  Bell,
  Plus,
  FolderKanban,
  Target,
  Square,
} from "lucide-react";
import { useRunningTimer, useElapsed, stopAndLogTimer } from "@/lib/timer";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { PublicUser } from "@/types";

interface SearchResults {
  projects: { id: string; name: string; color: string }[];
  tasks: { id: string; title: string; project: { id: string; name: string; color: string } }[];
  people: PublicUser[];
}

export function TopNav() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K or Ctrl+E focuses search.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "e")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setResults(await res.json());
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setResults(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function go(href: string) {
    setQuery("");
    setResults(null);
    router.push(href);
  }

  const empty =
    results &&
    results.projects.length === 0 &&
    results.tasks.length === 0 &&
    results.people.length === 0;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-sidebar px-2 sm:px-3">
      <Link href="/home" className="flex shrink-0 items-center gap-2 px-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.svg" alt="TaskFlow" className="h-7 w-7 dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-dark.svg" alt="TaskFlow" className="hidden h-7 w-7 dark:block" />
        <span className="hidden text-sm font-semibold tracking-tight sm:block">
          TaskFlow
        </span>
      </Link>

      {/* Search */}
      <div ref={searchRef} className="relative mx-auto w-full max-w-xl">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setResults((r) => r)}
          placeholder="Search (Ctrl+K)"
          className="h-8 w-full rounded-md border border-transparent bg-surface pl-9 pr-3 text-[13px] text-text outline-none transition-colors placeholder:text-faint focus:border-accent focus:bg-elevated"
        />
        {searching && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-faint"
          />
        )}

        {results && (
          <div className="animate-slide-up absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-overlay p-1.5 shadow-popover">
            {empty && (
              <p className="px-2 py-6 text-center text-[13px] text-faint">
                No results for “{query}”
              </p>
            )}
            <ResultGroup label="Projects" show={results.projects.length > 0}>
              {results.projects.map((p) => (
                <ResultRow key={p.id} onClick={() => go(`/projects/${p.id}`)}>
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded"
                    style={{ background: `${p.color}22` }}
                  >
                    <Hash size={12} style={{ color: p.color }} />
                  </span>
                  <span className="truncate">{p.name}</span>
                </ResultRow>
              ))}
            </ResultGroup>
            <ResultGroup label="Tasks" show={results.tasks.length > 0}>
              {results.tasks.map((t) => (
                <ResultRow key={t.id} onClick={() => go(`/projects/${t.project.id}`)}>
                  <CheckSquare size={14} className="text-faint" />
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-faint">
                    {t.project.name}
                  </span>
                </ResultRow>
              ))}
            </ResultGroup>
            <ResultGroup label="People" show={results.people.length > 0}>
              {results.people.map((u) => (
                <ResultRow key={u.id} onClick={() => go(`/friends`)}>
                  <Avatar name={u.name} src={u.avatar} size="xs" />
                  <span className="truncate">{u.name}</span>
                  <Users size={12} className="ml-auto shrink-0 text-faint" />
                </ResultRow>
              ))}
            </ResultGroup>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <RunningTimerPill />
        <QuickCreate />
        <NotifBell />
        <ThemeToggle />
        {/* Profile lives in the sidebar bottom on desktop; navbar on mobile. */}
        <div className="md:hidden">
          <UserMenuCompact />
        </div>
      </div>
    </header>
  );
}

function hmsShort(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

function RunningTimerPill() {
  const router = useRouter();
  const timer = useRunningTimer();
  const elapsed = useElapsed(timer ? timer.startedAt : null);
  if (!timer) return null;
  return (
    <div className="flex h-8 items-center gap-1 rounded-md border border-accent/40 bg-accent-soft pl-2 pr-1 text-accent">
      <button
        onClick={() => router.push(`/projects/${timer.projectId}`)}
        className="flex min-w-0 items-center gap-1.5"
        title={timer.title}
      >
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" />
        <span className="hidden max-w-[120px] truncate text-[12px] font-medium md:inline">{timer.title}</span>
        <span className="font-mono text-[12px] font-semibold tabular-nums">{hmsShort(elapsed)}</span>
      </button>
      <button
        onClick={() => stopAndLogTimer()}
        title="Stop & log time"
        className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-white"
      >
        <Square size={12} />
      </button>
    </div>
  );
}

function QuickCreate() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Create"
        className="flex h-8 w-8 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-text"
      >
        <Plus size={18} />
      </button>
      {open && (
        <div className="animate-slide-up absolute right-0 top-[calc(100%+8px)] z-50 w-44 overflow-hidden rounded-md border border-border bg-overlay p-1 shadow-popover">
          <Link href="/projects" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] text-muted hover:bg-surface hover:text-text">
            <FolderKanban size={14} /> New project
          </Link>
          <Link href="/goals" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] text-muted hover:bg-surface hover:text-text">
            <Target size={14} /> New goal
          </Link>
        </div>
      )}
    </div>
  );
}

function NotifBell() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUnread(d.unreadCount ?? 0))
      .catch(() => {});
  }, []);
  return (
    <Link
      href="/inbox"
      aria-label="Notifications"
      className="relative flex h-8 w-8 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-text"
    >
      <Bell size={17} />
      {unread > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 text-[8px] font-bold text-white ring-2 ring-sidebar">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function ResultGroup({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </p>
      {children}
    </div>
  );
}

function ResultRow({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface"
    >
      {children}
    </button>
  );
}

function UserMenuCompact() {
  const { data } = useSession();
  const user = data?.user;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn("rounded-full ring-2 ring-transparent transition", open && "ring-accent")}
      >
        <Avatar name={user.name ?? "?"} src={user.image} size="sm" />
      </button>
      {open && (
        <div className="animate-slide-up absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-md border border-border bg-overlay p-1 shadow-popover">
          <div className="px-2.5 py-2">
            <p className="truncate text-[13px] font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-faint">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <UserIcon size={14} /> Profile
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface hover:text-danger"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
