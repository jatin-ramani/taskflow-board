import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  color,
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, background: color ?? "var(--color-accent)" }}
      />
    </div>
  );
}
