import { cn } from "@/lib/utils";
import { MobileMenuButton } from "@/components/layout/app-shell";

export function PageHeader({
  title,
  icon,
  actions,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <MobileMenuButton className="-ml-1" />
        {icon && <span className="shrink-0 text-muted">{icon}</span>}
        <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
