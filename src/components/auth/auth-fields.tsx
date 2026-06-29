"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/password-input";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

export function LabeledInput({ label, icon, className, ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-text/85">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            {icon}
          </span>
        )}
        <input
          className={cn(
            "h-10 w-full rounded-lg border border-border bg-surface pr-3 text-sm text-text",
            "outline-none transition-colors duration-150 placeholder:text-faint",
            "focus:border-accent focus:ring-2 focus:ring-accent-soft",
            icon ? "pl-9" : "pl-3",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
}

export function LabeledPassword({ label, icon, ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-text/85">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-faint">
            {icon}
          </span>
        )}
        <PasswordInput {...props} />
      </div>
    </div>
  );
}
