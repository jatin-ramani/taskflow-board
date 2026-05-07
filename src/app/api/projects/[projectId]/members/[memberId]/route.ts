import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH /api/projects/[projectId]/members/[memberId] — Update role
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string, memberId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, memberId } = await params;
    const { role } = await req.json();

    // Check if requester is owner or admin of the project
    const requester = await prisma.projectMember.findFirst({
      where: { projectId, userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } }
    });
    
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const isOwner = project?.ownerId === session.user.id;

    if (!isOwner && !requester) {
      return NextResponse.json({ error: "Only project owner or admin can update roles" }, { status: 403 });
    }

    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role }
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

// DELETE /api/projects/[projectId]/members/[memberId] — Remove member
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ projectId: string, memberId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, memberId } = await params;

    // Check permissions (Owner or Admin)
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const isOwner = project?.ownerId === session.user.id;
    
    const requester = await prisma.projectMember.findFirst({
      where: { projectId, userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } }
    });

    if (!isOwner && !requester) {
      return NextResponse.json({ error: "Only project owner or admin can remove members" }, { status: 403 });
    }

    await prisma.projectMember.delete({ where: { id: memberId } });
    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
