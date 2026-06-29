import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return <Loader2 size={size} className={cn("animate-spin text-faint", className)} />;
}

export function FullSpinner({ label }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 py-16 text-faint">
      <Spinner size={22} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
