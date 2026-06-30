"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./app-sidebar";
import { TopNav } from "./top-nav";

const SidebarContext = createContext<{ open: () => void }>({ open: () => {} });
export const useSidebarToggle = () => useContext(SidebarContext).open;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <SidebarContext.Provider value={{ open: () => setOpen(true) }}>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg">
        <TopNav />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          <div className="hidden md:flex">
            <AppSidebar />
          </div>

          {/* Mobile drawer */}
          {open && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div
                className="animate-fade-in absolute inset-0 bg-black/50"
                onClick={() => setOpen(false)}
              />
              <div className="animate-slide-in-left absolute inset-y-0 left-0 shadow-lg">
                <AppSidebar />
              </div>
            </div>
          )}

          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

export function MobileMenuButton({ className }: { className?: string }) {
  const open = useSidebarToggle();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open menu"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-text md:hidden",
        className
      )}
    >
      <Menu size={18} />
    </button>
  );
}
