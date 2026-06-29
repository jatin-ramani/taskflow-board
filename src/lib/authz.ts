import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pairKey } from "@/lib/utils";
import type { ProjectRole } from "@prisma/client";

/**
 * The 0-bug contract: every route authorizes server-side through these helpers.
 * Throw HttpError anywhere in a handler; catch with toErrorResponse().
 */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  publicId: string;
  username: string | null;
  role: "ADMIN" | "MEMBER";
  image?: string | null;
}

/** Require an authenticated user or throw 401. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, "Unauthorized");
  return session.user as unknown as SessionUser;
}

const ROLE_RANK: Record<ProjectRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

export interface ProjectAccess {
  role: ProjectRole;
  ownerId: string;
}

/**
 * Require that `userId` can access `projectId` with at least `min` role.
 * Owner is always treated as OWNER even without an explicit membership row.
 */
export async function requireProjectRole(
  userId: string,
  projectId: string,
  min: ProjectRole = "VIEWER"
): Promise<ProjectAccess> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });
  if (!project) throw new HttpError(404, "Project not found");

  if (project.ownerId === userId) {
    return { role: "OWNER", ownerId: project.ownerId };
  }

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!member) throw new HttpError(403, "You don't have access to this project");
  if (ROLE_RANK[member.role] < ROLE_RANK[min]) {
    throw new HttpError(403, "You don't have permission to do that");
  }
  return { role: member.role, ownerId: project.ownerId };
}

/** Resolve a task to its project, then enforce project role. Returns the task's projectId. */
export async function requireTaskRole(
  userId: string,
  taskId: string,
  min: ProjectRole = "VIEWER"
): Promise<{ projectId: string; access: ProjectAccess }> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) throw new HttpError(404, "Task not found");
  const access = await requireProjectRole(userId, task.projectId, min);
  return { projectId: task.projectId, access };
}

/** A task can only be assigned to the project owner or a project member. */
export async function requireAssignable(
  projectId: string,
  assigneeId: string
): Promise<void> {
  const ok = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: assigneeId }, { members: { some: { userId: assigneeId } } }],
    },
    select: { id: true },
  });
  if (!ok) throw new HttpError(400, "Assignee must be a member of the project");
}

/** True if a and b have an ACCEPTED friendship. */
export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const f = await prisma.friendship.findUnique({
    where: { pairKey: pairKey(a, b) },
    select: { status: true },
  });
  return f?.status === "ACCEPTED";
}

export async function requireFriendship(a: string, b: string): Promise<void> {
  if (!(await areFriends(a, b))) {
    throw new HttpError(403, "You must be friends to do that");
  }
}

/** Map thrown errors to a JSON response. Wrap every handler's catch with this. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[route error]", err);
  return NextResponse.json(
    { error: "Something went wrong" },
    { status: 500 }
  );
}
