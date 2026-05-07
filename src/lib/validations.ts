import { z } from "zod";

// ============================================
// AUTH SCHEMAS
// ============================================
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ============================================
// PROJECT SCHEMAS
// ============================================
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// ============================================
// TASK SCHEMAS
// ============================================
export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  projectId: z.string().min(1, "Project is required"),
  columnId: z.string().min(1, "Column is required"),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  position: z.number().optional(),
});

// ============================================
// COMMENT SCHEMAS
// ============================================
export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  mentions: z.array(z.string()).optional(),
});

// ============================================
// TIME ENTRY SCHEMAS
// ============================================
export const createTimeEntrySchema = z.object({
  startTime: z.string(),
  endTime: z.string().optional(),
  duration: z.number().optional(),
  description: z.string().max(500).optional(),
  isRunning: z.boolean().optional(),
});

export const stopTimerSchema = z.object({
  endTime: z.string(),
});

// ============================================
// COLUMN SCHEMAS
// ============================================
export const createColumnSchema = z.object({
  name: z.string().min(1, "Column name is required").max(50),
  color: z.string().optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
