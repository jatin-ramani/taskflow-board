"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

const sizeMap = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-16 w-16 text-lg",
} as const;

// Deterministic accent tint from a string, so avatars are stable per-user.
const palette = [
  "#5b5fc7", "#4cb782", "#f2994a", "#eb5757",
  "#56a8f5", "#bb6bd9", "#2d9cdb", "#27ae60",
];
function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
  /** Optional online presence dot */
  online?: boolean;
}

export function Avatar({ name, src, size = "md", className, online }: AvatarProps) {
  const [errored, setErrored] = React.useState(false);
  const showImage = src && !errored;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold text-white overflow-hidden",
          sizeMap[size]
        )}
        style={showImage ? undefined : { background: colorFor(name) }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setErrored(true)}
          />
        ) : (
          getInitials(name)
        )}
      </span>
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-bg",
            size === "xs" || size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
            online ? "bg-success" : "bg-faint"
          )}
        />
      )}
    </span>
  );
}
