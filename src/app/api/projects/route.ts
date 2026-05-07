import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validations";
import { getRandomColor } from "@/lib/utils";

// GET /api/projects — List all projects for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

// POST /api/projects — Create a new project
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { name, description, color, icon } = parsed.data;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        color: color || getRandomColor(),
        icon: icon || "folder",
        ownerId: session.user.id,
        members: { create: { userId: session.user.id, role: "OWNER" } },
        columns: {
          create: [
            { name: "To Do", color: "#6b7280", position: 0 },
            { name: "In Progress", color: "#0065ff", position: 1 },
            { name: "In Review", color: "#ff8b00", position: 2 },
            { name: "Done", color: "#36b37e", position: 3 },
          ],
        },
      },
      include: {
        columns: true,
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
