import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { publicUserSelect } from "@/lib/selectors";
import { updateMemberSchema } from "@/lib/validations";

// PATCH /api/projects/[projectId]/members/[memberId] — change a member's role (ADMIN+).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId, memberId } = await params;
    await requireProjectRole(me.id, projectId, "ADMIN");

    const body = await req.json();
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const member = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
      select: { id: true },
    });
    if (!member) throw new HttpError(404, "Member not found");

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role: parsed.data.role },
      select: { id: true, role: true, user: { select: publicUserSelect } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/projects/[projectId]/members/[memberId] — remove a member, or leave.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId, memberId } = await params;

    const member = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
      select: { id: true, userId: true },
    });
    if (!member) throw new HttpError(404, "Member not found");

    // Removing someone else requires ADMIN; removing yourself (leaving) is allowed.
    if (member.userId !== me.id) {
      await requireProjectRole(me.id, projectId, "ADMIN");
    }

    await prisma.projectMember.delete({ where: { id: memberId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
