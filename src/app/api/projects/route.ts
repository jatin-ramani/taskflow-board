import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse, HttpError } from "@/lib/authz";
import { createProjectSchema } from "@/lib/validations";
import { getRandomColor } from "@/lib/utils";
import type { ProjectRole } from "@prisma/client";

// GET /api/projects — projects the current user owns or is a member of.
// (Full CRUD lands in Phase 3; this powers the sidebar now.)
export async function GET() {
  try {
    const me = await requireUser();

    const projects = await prisma.project.findMany({
      where: {
        OR: [{ ownerId: me.id }, { members: { some: { userId: me.id } } }],
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isPersonal: true,
        ownerId: true,
        members: { where: { userId: me.id }, select: { role: true } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: [{ isPersonal: "desc" }, { updatedAt: "desc" }],
    });

    const result = projects.map((p) => {
      const role: ProjectRole =
        p.ownerId === me.id ? "OWNER" : p.members[0]?.role ?? "VIEWER";
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        icon: p.icon,
        isPersonal: p.isPersonal,
        role,
        taskCount: p._count.tasks,
        memberCount: p._count.members,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/projects — create a project (with default sections).
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

    const { name, description, color, icon } = parsed.data;

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        color: color || getRandomColor(),
        icon: icon || "folder",
        ownerId: me.id,
        sections: {
          create: [
            { name: "Todo", position: 0 },
            { name: "In Progress", position: 1 },
            { name: "Done", position: 2 },
          ],
        },
      },
      select: { id: true, name: true, color: true, icon: true, isPersonal: true },
    });

    return NextResponse.json(
      {
        id: project.id,
        name: project.name,
        color: project.color,
        icon: project.icon,
        isPersonal: project.isPersonal,
        role: "OWNER" as ProjectRole,
        taskCount: 0,
        memberCount: 0,
      },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
