import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { createSectionSchema } from "@/lib/validations";

// POST /api/projects/[projectId]/sections — add a board section/column.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;
    await requireProjectRole(me.id, projectId, "EDITOR");

    const body = await req.json();
    const parsed = createSectionSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const last = await prisma.section.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const section = await prisma.section.create({
      data: {
        name: parsed.data.name,
        position: (last?.position ?? -1) + 1,
        projectId,
      },
      select: { id: true, name: true, position: true },
    });

    return NextResponse.json({ ...section, tasks: [] }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
