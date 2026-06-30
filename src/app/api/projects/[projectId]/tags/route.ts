import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { createTagSchema } from "@/lib/validations";
import { getRandomColor } from "@/lib/utils";

// GET /api/projects/[projectId]/tags
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;
    await requireProjectRole(me.id, projectId, "VIEWER");
    const tags = await prisma.tag.findMany({
      where: { projectId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tags);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/projects/[projectId]/tags
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const me = await requireUser();
    const { projectId } = await params;
    await requireProjectRole(me.id, projectId, "EDITOR");
    const body = await req.json();
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const tag = await prisma.tag.create({
      data: {
        name: parsed.data.name,
        color: parsed.data.color || getRandomColor(),
        projectId,
      },
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
