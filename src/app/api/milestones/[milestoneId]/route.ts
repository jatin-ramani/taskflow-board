import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { updateMilestoneSchema } from "@/lib/validations";

async function milestoneProject(id: string): Promise<string> {
  const m = await prisma.milestone.findUnique({
    where: { id },
    select: { projectId: true },
  });
  if (!m) throw new HttpError(404, "Milestone not found");
  return m.projectId;
}

// PATCH /api/milestones/[milestoneId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const me = await requireUser();
    const { milestoneId } = await params;
    const projectId = await milestoneProject(milestoneId);
    await requireProjectRole(me.id, projectId, "EDITOR");

    const body = await req.json();
    const parsed = updateMilestoneSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.color !== undefined) data.color = parsed.data.color;
    if (parsed.data.completed !== undefined) data.completed = parsed.data.completed;
    if (parsed.data.dueDate !== undefined)
      data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

    const m = await prisma.milestone.update({
      where: { id: milestoneId },
      data,
      select: { id: true, name: true, color: true, dueDate: true, completed: true },
    });
    return NextResponse.json(m);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/milestones/[milestoneId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const me = await requireUser();
    const { milestoneId } = await params;
    const projectId = await milestoneProject(milestoneId);
    await requireProjectRole(me.id, projectId, "EDITOR");
    await prisma.milestone.delete({ where: { id: milestoneId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
