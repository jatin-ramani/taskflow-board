import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-border bg-elevated px-3 text-sm text-text placeholder:text-faint",
        "transition-colors duration-150 outline-none",
        "focus:border-accent focus:ring-2 focus:ring-accent-soft",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text placeholder:text-faint",
        "transition-colors duration-150 outline-none resize-none",
        "focus:border-accent focus:ring-2 focus:ring-accent-soft",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
