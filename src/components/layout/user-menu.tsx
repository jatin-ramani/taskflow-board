"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ChevronsUpDown, LogOut, User as UserIcon, Check, Copy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export function UserMenu() {
  const { data } = useSession();
  const user = data?.user;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  async function copyCode() {
    if (!user?.publicId) return;
    await navigator.clipboard.writeText(user.publicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface"
      >
        <Avatar name={user.name ?? "?"} src={user.image} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{user.name}</p>
          <p className="truncate text-[11px] text-faint">
            {user.username ? `@${user.username}` : user.publicId}
          </p>
        </div>
        <ChevronsUpDown size={14} className="shrink-0 text-faint" />
      </button>

      {open && (
        <div className="animate-slide-up absolute bottom-[calc(100%+6px)] left-0 right-0 z-50 overflow-hidden rounded-lg border border-border bg-overlay p-1 shadow-popover">
          <div className="px-2.5 py-2">
            <p className="truncate text-[13px] font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-faint">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            onClick={copyCode}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface hover:text-text"
          >
            {copied ? (
              <Check size={14} className="text-success" />
            ) : (
              <Copy size={14} />
            )}
            <span className="flex-1 text-left">Friend code</span>
            <span className="font-mono text-[11px] tracking-wider text-faint">
              {user.publicId}
            </span>
          </button>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <UserIcon size={14} />
            Profile
          </Link>
          <div className="my-1 h-px bg-border" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface hover:text-danger"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
