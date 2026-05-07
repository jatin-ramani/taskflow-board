import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    console.log(`Fetching notifications for user: ${session.user.id}`);
    
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: session.user.id },
        include: { 
          actor: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json(notifications);
    } catch (dbError: any) {
      console.error("Database error fetching notifications:", dbError.message);
      // Fallback: Try without include if the relation is missing
      const notifications = await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json(notifications);
    }
  } catch (error) {
    console.error("GET notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
