import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { notificationId } = await params;
    const { action } = await req.json(); // "accept" or "reject"

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (action === "accept") {
      if (!notification.relatedProjectId) return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });

      // Add to project
      await prisma.projectMember.create({
        data: {
          projectId: notification.relatedProjectId,
          userId: session.user.id,
          role: "EDITOR" // Default role
        }
      });
      
      // Delete notification after accept
      await prisma.notification.delete({ where: { id: notificationId } });
      
      return NextResponse.json({ message: "Invitation accepted" });
    } else {
      // Just delete/archive if rejected
      await prisma.notification.delete({ where: { id: notificationId } });
      return NextResponse.json({ message: "Invitation rejected" });
    }
  } catch (error) {
    console.error("Response error:", error);
    return NextResponse.json({ error: "Failed to respond to invitation" }, { status: 500 });
  }
}
