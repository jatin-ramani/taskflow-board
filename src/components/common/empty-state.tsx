import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-16 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-faint">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-text">{title}</p>
      {description && (
        <p className="max-w-xs text-[13px] text-muted">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
