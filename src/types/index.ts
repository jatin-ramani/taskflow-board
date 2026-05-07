// Extended type definitions for the application
// These augment the Prisma-generated types with additional fields

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  createdAt: Date;
}

export interface ProjectWithDetails {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
  ownerId: string;
  owner: UserProfile;
  members: ProjectMemberWithUser[];
  columns: ColumnWithTasks[];
  _count: {
    tasks: number;
  };
  completedTaskCount?: number;
  totalTaskCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberWithUser {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
  user: UserProfile;
  joinedAt: Date;
}

export interface ColumnWithTasks {
  id: string;
  name: string;
  color: string;
  position: number;
  projectId: string;
  tasks: TaskCard[];
}

export interface TaskCard {
  id: string;
  title: string;
  description: string | null;
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  position: number;
  dueDate: Date | null;
  totalTimeLogged: number;
  tags: string[];
  columnId: string;
  projectId: string;
  assignee: UserProfile | null;
  creator: UserProfile;
  _count: {
    subtasks: number;
    comments: number;
  };
  completedSubtaskCount?: number;
  createdAt: Date;
}

export interface TaskDetail extends TaskCard {
  startDate: Date | null;
  completedAt: Date | null;
  attachments: string[];
  assigneeId: string | null;
  creatorId: string;
  parentTaskId: string | null;
  subtasks: TaskCard[];
  comments: CommentWithAuthor[];
  timeEntries: TimeEntryWithUser[];
  activities: ActivityWithUser[];
}

export interface CommentWithAuthor {
  id: string;
  content: string;
  mentions: string[];
  taskId: string;
  authorId: string;
  author: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntryWithUser {
  id: string;
  startTime: Date;
  endTime: Date | null;
  duration: number | null;
  description: string | null;
  isRunning: boolean;
  taskId: string;
  userId: string;
  user: UserProfile;
  createdAt: Date;
}

export interface ActivityWithUser {
  id: string;
  action: string;
  details: string | null;
  taskId: string | null;
  projectId: string | null;
  userId: string;
  user: UserProfile;
  createdAt: Date;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  userId: string;
  actorId: string | null;
  relatedTaskId: string | null;
  relatedProjectId: string | null;
  createdAt: Date;
}

// Dashboard Analytics Types
export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeTasks: number;
  totalTimeLoggedToday: number;
  totalTimeLoggedWeek: number;
  completedToday: number;
  activeTimers: number;
}

export interface UserWorkload {
  user: UserProfile;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalTimeLogged: number;
}

export interface TaskCompletionData {
  date: string;
  completed: number;
  created: number;
}

export interface TimeDistribution {
  project: string;
  color: string;
  totalTime: number;
  percentage: number;
}
