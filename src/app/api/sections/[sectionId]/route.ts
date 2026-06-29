import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { updateSectionSchema } from "@/lib/validations";

async function sectionProject(sectionId: string): Promise<string> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { projectId: true },
  });
  if (!section) throw new HttpError(404, "Section not found");
  return section.projectId;
}

// PATCH /api/sections/[sectionId] — rename / reposition.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const me = await requireUser();
    const { sectionId } = await params;
    const projectId = await sectionProject(sectionId);
    await requireProjectRole(me.id, projectId, "EDITOR");

    const body = await req.json();
    const parsed = updateSectionSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const section = await prisma.section.update({
      where: { id: sectionId },
      data: parsed.data,
      select: { id: true, name: true, position: true },
    });
    return NextResponse.json(section);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/sections/[sectionId] — moves its tasks into the first remaining section.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const me = await requireUser();
    const { sectionId } = await params;
    const projectId = await sectionProject(sectionId);
    await requireProjectRole(me.id, projectId, "EDITOR");

    const sections = await prisma.section.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    if (sections.length <= 1) {
      throw new HttpError(400, "A project needs at least one section");
    }

    const fallback = sections.find((s) => s.id !== sectionId)!;

    await prisma.$transaction([
      prisma.task.updateMany({
        where: { sectionId },
        data: { sectionId: fallback.id },
      }),
      prisma.section.delete({ where: { id: sectionId } }),
    ]);

    return NextResponse.json({ ok: true, movedTo: fallback.id });
  } catch (err) {
    return toErrorResponse(err);
  }
}
