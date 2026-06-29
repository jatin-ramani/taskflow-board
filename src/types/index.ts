// Shared client-facing domain types.
// API routes return JSON, so dates arrive as ISO strings on the client.
import type { PublicUser } from "@/lib/selectors";

export type { PublicUser };

export type ProjectRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
export type Priority = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type GoalStatus = "ACTIVE" | "ON_HOLD" | "ACHIEVED" | "ARCHIVED";
export type FriendshipStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED";

export interface FriendItem {
  friendshipId: string;
  user: PublicUser;
  since: string;
  online: boolean;
}

export interface FriendRequestItem {
  friendshipId: string;
  user: PublicUser;
  direction: "incoming" | "outgoing";
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  color: string;
  icon: string;
  isPersonal: boolean;
  role: ProjectRole;
  taskCount: number;
  memberCount: number;
}

export interface TaskCardDTO {
  id: string;
  title: string;
  priority: Priority;
  position: number;
  dueDate: string | null;
  startDate: string | null;
  completedAt: string | null;
  isFavorite: boolean;
  tags: string[];
  sectionId: string;
  projectId: string;
  goalId: string | null;
  assignee: PublicUser | null;
  _count: { subtasks: number; comments: number };
}

export interface SectionDTO {
  id: string;
  name: string;
  position: number;
  tasks: TaskCardDTO[];
}

export interface ProjectMemberDTO {
  id: string;
  role: ProjectRole;
  user: PublicUser;
}

export interface ProjectDetailDTO {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isPersonal: boolean;
  ownerId: string;
  owner: PublicUser;
  members: ProjectMemberDTO[];
  sections: SectionDTO[];
  role: ProjectRole;
}

/** A task card decorated with its project + section, for cross-project lists. */
export interface MyTaskDTO extends TaskCardDTO {
  section: { id: string; name: string };
  project: { id: string; name: string; color: string };
}

export interface GoalDTO {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  targetDate: string | null;
  progress: number;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
  taskCount: number;
  completedCount: number;
}

export interface GoalDetailDTO extends GoalDTO {
  tasks: MyTaskDTO[];
}

export interface CommentDTO {
  id: string;
  content: string;
  mentionIds: string[];
  createdAt: string;
  author: PublicUser;
}

export interface TaskActivityDTO {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  user: PublicUser;
}

export interface TaskDetailDTO extends TaskCardDTO {
  description: string | null;
  creatorId: string;
  parentTaskId: string | null;
  assigneeId: string | null;
  creator: PublicUser;
  section: { id: string; name: string };
  project: { id: string; name: string; color: string };
  goal: { id: string; title: string; progress: number } | null;
  subtasks: TaskCardDTO[];
  comments: CommentDTO[];
  activities: TaskActivityDTO[];
}

export interface DashboardStats {
  activeCount: number;
  completedCount: number;
  overdueCount: number;
  dueTodayCount: number;
  completedThisWeek: number;
  projectCount: number;
  friendCount: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  actor: PublicUser | null;
  createdAt: string;
}
