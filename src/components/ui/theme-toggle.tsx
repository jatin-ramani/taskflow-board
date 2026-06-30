"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-text",
        className
      )}
    >
      {/* Render a stable icon until mounted to avoid hydration mismatch */}
      {!mounted ? (
        <Moon size={15} />
      ) : isDark ? (
        <Sun size={15} />
      ) : (
        <Moon size={15} />
      )}
    </button>
  );
}

/** Larger labeled segmented control for the profile page. */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme : "dark";

  const options = [
    { value: "light", label: "Light", icon: <Sun size={14} /> },
    { value: "dark", label: "Dark", icon: <Moon size={14} /> },
  ];

  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setTheme(o.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
            current === o.value
              ? "bg-elevated text-text shadow-sm"
              : "text-muted hover:text-text"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
