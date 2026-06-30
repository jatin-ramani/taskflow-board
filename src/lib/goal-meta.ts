import type { GoalStatus } from "@/types";

export const GOAL_STATUS_META: Record<
  GoalStatus,
  { label: string; color: string }
> = {
  ACTIVE: { label: "Active", color: "#5b5fc7" },
  ON_HOLD: { label: "On hold", color: "#f2c94c" },
  ACHIEVED: { label: "Achieved", color: "#4cb782" },
  ARCHIVED: { label: "Archived", color: "#71757d" },
};

export const GOAL_STATUS_ORDER: GoalStatus[] = [
  "ACTIVE",
  "ON_HOLD",
  "ACHIEVED",
  "ARCHIVED",
];
