import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await params;
    const { email } = await req.json();

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    // Check if project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!recipient) return NextResponse.json({ error: "User not found. They must register first." }, { status: 404 });

    // Check if already a member
    const existingMember = await prisma.projectMember.findFirst({
      where: { projectId, userId: recipient.id }
    });
    if (existingMember || project.ownerId === recipient.id) {
      return NextResponse.json({ error: "User is already a member of this project" }, { status: 400 });
    }

    console.log(`Sending invite from ${session.user.id} to email: ${email} for project: ${projectId}`);

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        type: "PROJECT_INVITE",
        title: "Project Invitation",
        message: `You've been invited to join the project: ${project.name}`,
        userId: recipient.id,
        actorId: session.user.id,
        relatedProjectId: projectId,
      }
    });

    console.log(`Notification created successfully: ${notification.id}`);
    return NextResponse.json({ message: "Invitation sent successfully" });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}
