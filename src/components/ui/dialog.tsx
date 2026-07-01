"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  showClose = true,
  title,
  closeClassName,
}: {
  className?: string;
  children: React.ReactNode;
  showClose?: boolean;
  /** Screen-reader-only title for dialogs that don't render a visible one. */
  title?: string;
  /** Override the close button styling (e.g. white on a colored header). */
  closeClassName?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/55" />
      <DialogPrimitive.Content
        onInteractOutside={(e) => {
          // Our Select menus / DatePicker calendars / emoji pickers render to
          // document.body, so Radix treats clicking them as "outside" and would
          // close the dialog. Keep it open when the interaction is inside one.
          const target = e.detail.originalEvent.target as Element | null;
          if (target?.closest?.("[data-portal-popover]")) e.preventDefault();
        }}
        className={cn(
          "animate-slide-up fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
          "max-h-[calc(100dvh-2rem)] overflow-hidden rounded-xl border border-border bg-elevated shadow-popover focus:outline-none",
          className
        )}
      >
        {title && (
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        )}
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-text",
              closeClassName
            )}
          >
            <X size={16} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border px-5 py-4">
      <DialogPrimitive.Title className="text-[15px] font-semibold">
        {title}
      </DialogPrimitive.Title>
      {description && (
        <DialogPrimitive.Description className="mt-0.5 text-[13px] text-muted">
          {description}
        </DialogPrimitive.Description>
      )}
    </div>
  );
}
