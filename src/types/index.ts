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
  isFavorite: boolean;
  dueDate: string | null;
  role: ProjectRole;
  taskCount: number;
  memberCount: number;
  doneCount: number;
  totalCount: number;
  manager: PublicUser | null;
}

export interface TagDTO {
  id: string;
  name: string;
  color: string;
}

export interface MilestoneDTO {
  id: string;
  name: string;
  color: string;
  dueDate: string | null;
  completed: boolean;
  taskCount?: number;
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
  taskType: string | null;
  estimateMinutes: number | null;
  billable: boolean;
  milestoneId: string | null;
  tagIds: string[];
  followerIds: string[];
  plannedStart: string | null;
  plannedEnd: string | null;
  worklogSeconds?: number;
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
  milestones: MilestoneDTO[];
  tags: TagDTO[];
  role: ProjectRole;
}

/** A task card decorated with its project + section, for cross-project lists. */
export interface MyTaskDTO extends TaskCardDTO {
  section: { id: string; name: string };
  project: { id: string; name: string; color: string };
}

export interface ConversationDTO {
  id: string;
  isGroup: boolean;
  title: string;
  image: string | null; // group icon
  avatarUsers: PublicUser[]; // DM: [other]; group: members
  memberCount: number;
  lastMessage: {
    content: string;
    createdAt: string;
    isMine: boolean;
    senderName: string | null;
  } | null;
  lastMessageAt: string;
  unreadCount: number;
  online: boolean; // DM only
  muted: boolean;
  favorite: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  publicId: string;
  bio: string | null;
  online: boolean;
  isFriend: boolean;
}

export type MemberPresence = PublicUser & { online: boolean };

export interface ConversationMeta {
  id: string;
  isGroup: boolean;
  title: string;
  image: string | null;
  members: MemberPresence[];
  online: boolean;
  pinned: { id: string; content: string; senderName: string } | null;
  vanishMode: boolean;
}

export interface MessageReplyPreview {
  id: string;
  content: string;
  senderName: string;
}

export interface MessageDTO {
  id: string;
  content: string;
  senderId: string;
  sender: PublicUser;
  attachments: string[];
  reactions: Record<string, string[]>;
  replyTo: MessageReplyPreview | null;
  system: boolean;
  createdAt: string;
  editedAt: string | null;
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
  milestone: { id: string; name: string; color: string } | null;
  goal: { id: string; title: string; progress: number } | null;
  resolvedTags: TagDTO[];
  followers: PublicUser[];
  worklogSeconds: number;
  subtasks: TaskCardDTO[];
  comments: CommentDTO[];
  activities: TaskActivityDTO[];
}

export interface WorklogEntry {
  id: string;
  durationSeconds: number;
  note: string | null;
  startedAt: string;
  createdAt: string;
  user: PublicUser;
}

export interface ProjectDashboardDTO {
  totals: {
    total: number;
    open: number;
    completed: number;
    overdue: number;
    dueToday: number;
  };
  estimateMinutes: number;
  loggedSeconds: number;
  billable: number;
  byStatus: { name: string; count: number }[];
  byPriority: { name: string; count: number; color: string }[];
  byType: { name: string; count: number }[];
  byAssignee: { name: string; avatar: string | null; count: number }[];
  milestones: { name: string; color: string; done: number; total: number; pct: number }[];
  leaderboard: { name: string; avatar: string | null; seconds: number }[];
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
