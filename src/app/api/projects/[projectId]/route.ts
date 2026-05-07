import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/projects/[projectId]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true } } } },
        columns: { orderBy: { position: "asc" }, include: {
          tasks: {
            where: { parentTaskId: null },
            orderBy: { position: "asc" },
            include: {
              assignee: { select: { id: true, name: true, email: true, avatar: true } },
              creator: { select: { id: true, name: true, email: true, avatar: true } },
              _count: { select: { subtasks: true, comments: true } },
            },
          },
        }},
        _count: { select: { tasks: true } },
      },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Check membership
    const userId = session.user!.id;
    const isMember = project.ownerId === userId || project.members.some((m: { userId: string }) => m.userId === userId);
    if (!isMember) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    return NextResponse.json(project);
  } catch (error) {
    console.error("GET project error:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

// PUT /api/projects/[projectId]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { projectId } = await params;
    const body = await req.json();

    const project = await prisma.project.update({ where: { id: projectId }, data: body });
    return NextResponse.json(project);
  } catch (error) {
    console.error("PUT project error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// DELETE /api/projects/[projectId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { projectId } = await params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (project.ownerId !== session.user.id) return NextResponse.json({ error: "Only project owner can delete" }, { status: 403 });

    await prisma.project.delete({ where: { id: projectId } });
    return NextResponse.json({ message: "Project deleted" });
  } catch (error) {
    console.error("DELETE project error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
