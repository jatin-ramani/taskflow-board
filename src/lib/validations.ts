import { z } from "zod";

// ============================================================
// AUTH
// ============================================================
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
    email: z.email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// ============================================================
// PROFILE
// ============================================================
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "3–20 chars: letters, numbers, underscore");

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  username: usernameSchema.nullable().optional(),
  bio: z.string().max(280).nullable().optional(),
  avatar: z.string().url().nullable().optional(),
});

// ============================================================
// FRIENDS
// ============================================================
export const userSearchSchema = z.object({
  q: z.string().trim().min(1, "Enter a search term").max(40),
});

export const friendRequestSchema = z.object({
  // Add by exact publicId or @username, or by resolved userId.
  publicId: z.string().trim().optional(),
  username: z.string().trim().optional(),
  userId: z.string().trim().optional(),
});

export const friendRespondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

// ============================================================
// PROJECTS
// ============================================================
export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(80),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});
export const updateProjectSchema = createProjectSchema.partial();

export const inviteMemberSchema = z.object({
  userId: z.string().min(1, "User is required"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("EDITOR"),
});
export const updateMemberSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

// ============================================================
// SECTIONS
// ============================================================
export const createSectionSchema = z.object({
  name: z.string().trim().min(1).max(50),
});
export const updateSectionSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  position: z.number().int().optional(),
});

// ============================================================
// TASKS
// ============================================================
const pmsTaskFields = {
  taskType: z.string().max(40).nullable().optional(),
  estimateMinutes: z.number().int().min(0).max(1000000).nullable().optional(),
  billable: z.boolean().optional(),
  milestoneId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  followerIds: z.array(z.string()).optional(),
  plannedStart: z.string().nullable().optional(),
  plannedEnd: z.string().nullable().optional(),
};

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  projectId: z.string().min(1),
  sectionId: z.string().min(1),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  parentTaskId: z.string().nullable().optional(),
  goalId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  ...pmsTaskFields,
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  sectionId: z.string().optional(),
  position: z.number().int().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  goalId: z.string().nullable().optional(),
  isFavorite: z.boolean().optional(),
  completed: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  ...pmsTaskFields,
});

// PMS: tags, milestones, work logs
export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().optional(),
});
export const createMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().optional(),
  dueDate: z.string().nullable().optional(),
});
export const updateMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  color: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  completed: z.boolean().optional(),
});
export const addWorklogSchema = z.object({
  durationSeconds: z.number().int().min(1).max(86400),
  note: z.string().max(500).optional(),
});

export const reorderTaskSchema = z.object({
  sectionId: z.string().min(1),
  // ordered task ids within the target section
  taskIds: z.array(z.string()).min(1),
});

// ============================================================
// GOALS
// ============================================================
export const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Goal title is required").max(160),
  description: z.string().max(2000).optional(),
  targetDate: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
});
export const updateGoalSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "ACHIEVED", "ARCHIVED"]).optional(),
  targetDate: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
});

// ============================================================
// COMMENTS
// ============================================================
export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(2000),
  mentionIds: z.array(z.string()).optional(),
});

// ============================================================
// CHAT
// ============================================================
export const startConversationSchema = z.object({
  userId: z.string().min(1),
});
export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(60),
  userIds: z.array(z.string()).min(1, "Add at least one friend").max(30),
});
export const addMembersSchema = z.object({
  userIds: z.array(z.string()).min(1).max(30),
});
export const updateConversationSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  avatar: z.string().nullable().optional(),
  disappearSeconds: z.number().int().min(0).max(2592000).nullable().optional(),
});
export const conversationSettingsSchema = z.object({
  muted: z.boolean().optional(),
  favorite: z.boolean().optional(),
  clear: z.boolean().optional(),
});
export const sendMessageSchema = z.object({
  content: z.string().max(4000).optional(),
  attachments: z.array(z.string()).max(10).optional(),
  replyToId: z.string().optional().nullable(),
});
export const editMessageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(4000),
});
export const reactSchema = z.object({
  emoji: z.string().min(1).max(12),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
