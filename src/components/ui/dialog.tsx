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
}: {
  className?: string;
  children: React.ReactNode;
  showClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/55" />
      <DialogPrimitive.Content
        className={cn(
          "animate-slide-up fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
          "max-h-[calc(100dvh-2rem)] overflow-hidden rounded-xl border border-border bg-elevated shadow-popover focus:outline-none",
          className
        )}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface hover:text-text">
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
