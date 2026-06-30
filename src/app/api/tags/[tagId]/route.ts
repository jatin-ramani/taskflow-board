import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";

// DELETE /api/tags/[tagId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const me = await requireUser();
    const { tagId } = await params;
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      select: { projectId: true },
    });
    if (!tag) throw new HttpError(404, "Tag not found");
    await requireProjectRole(me.id, tag.projectId, "EDITOR");
    await prisma.tag.delete({ where: { id: tagId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
