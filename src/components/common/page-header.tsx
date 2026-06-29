import { cn } from "@/lib/utils";

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
        "flex h-14 shrink-0 items-center justify-between border-b border-border px-6",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-muted">{icon}</span>}
        <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
