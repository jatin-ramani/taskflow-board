import type { GoalStatus } from "@/types";

export const GOAL_STATUS_META: Record<
  GoalStatus,
  { label: string; color: string }
> = {
  ACTIVE: { label: "Active", color: "#4f9dff" },
  ON_HOLD: { label: "On hold", color: "#f5a623" },
  ACHIEVED: { label: "Achieved", color: "#22c55e" },
  ARCHIVED: { label: "Archived", color: "#9aa3b2" },
};

export const GOAL_STATUS_ORDER: GoalStatus[] = [
  "ACTIVE",
  "ON_HOLD",
  "ACHIEVED",
  "ARCHIVED",
];
