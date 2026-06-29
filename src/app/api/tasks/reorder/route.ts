import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  requireProjectRole,
  toErrorResponse,
  HttpError,
} from "@/lib/authz";
import { reorderTaskSchema } from "@/lib/validations";

// POST /api/tasks/reorder — set the order (and section) of tasks after a drag.
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json();
    const parsed = reorderTaskSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const { sectionId, taskIds } = parsed.data;

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: { projectId: true },
    });
    if (!section) throw new HttpError(404, "Section not found");
    await requireProjectRole(me.id, section.projectId, "EDITOR");

    // Guard: every task must belong to this project.
    const count = await prisma.task.count({
      where: { id: { in: taskIds }, projectId: section.projectId },
    });
    if (count !== taskIds.length) {
      throw new HttpError(400, "Some tasks don't belong to this project");
    }

    await prisma.$transaction(
      taskIds.map((id, index) =>
        prisma.task.update({
          where: { id },
          data: { sectionId, position: index },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
