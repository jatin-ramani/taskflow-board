import type { Priority } from "@/types";

export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; rank: number }
> = {
  URGENT: { label: "Urgent", color: "var(--color-prio-urgent)", rank: 4 },
  HIGH: { label: "High", color: "var(--color-prio-high)", rank: 3 },
  MEDIUM: { label: "Medium", color: "var(--color-prio-medium)", rank: 2 },
  LOW: { label: "Low", color: "var(--color-prio-low)", rank: 1 },
  NONE: { label: "No priority", color: "var(--color-faint)", rank: 0 },
};

export const PRIORITY_ORDER: Priority[] = [
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
  "NONE",
];
