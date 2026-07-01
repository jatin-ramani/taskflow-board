import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";

// POST /api/projects/[projectId]/sections/reorder — set column order after a drag (EDITOR+).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;
    await requireProjectRole(me.id, projectId, "EDITOR");

    const body = await req.json();
    const sectionIds = body?.sectionIds;
    if (!Array.isArray(sectionIds) || sectionIds.some((id) => typeof id !== "string")) {
      throw new HttpError(400, "sectionIds must be an array of section ids");
    }

    // Guard: every section must belong to this project.
    const count = await prisma.section.count({
      where: { id: { in: sectionIds }, projectId },
    });
    if (count !== sectionIds.length) {
      throw new HttpError(400, "Some sections don't belong to this project");
    }

    await prisma.$transaction(
      sectionIds.map((id: string, index: number) =>
        prisma.section.update({ where: { id }, data: { position: index } })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
