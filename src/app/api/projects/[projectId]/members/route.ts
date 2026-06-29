import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  requireFriendship,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";
import { inviteMemberSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";

// POST /api/projects/[projectId]/members — add a friend to the project (ADMIN+).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;
    await requireProjectRole(me.id, projectId, "ADMIN");

    const body = await req.json();
    const parsed = inviteMemberSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const { userId, role } = parsed.data;

    // You can only add people you're friends with.
    await requireFriendship(me.id, userId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, name: true },
    });
    if (!project) throw new HttpError(404, "Project not found");
    if (project.ownerId === userId) {
      throw new HttpError(400, "They already own this project");
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true },
    });
    if (existing) throw new HttpError(400, "They're already a member");

    const member = await prisma.projectMember.create({
      data: { projectId, userId, role },
      select: { id: true, role: true, user: { select: publicUserSelect } },
    });

    await createNotification({
      recipientId: userId,
      actorId: me.id,
      type: "PROJECT_INVITE",
      title: "Added to a project",
      body: `${me.name} added you to “${project.name}”`,
      entityType: "PROJECT",
      entityId: projectId,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
