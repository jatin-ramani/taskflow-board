import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { ids, updates } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No task IDs provided" }, { status: 400 });
    }

    const finalUpdates: any = { ...updates };
    if (updates.status === "DONE") finalUpdates.completedAt = new Date();

    const updated = await prisma.task.updateMany({
      where: { id: { in: ids } },
      data: finalUpdates
    });

    // Log bulk activity (simplified)
    await prisma.activity.create({
      data: {
        action: "UPDATED",
        userId: session.user.id,
        details: `Bulk updated ${ids.length} tasks: ${JSON.stringify(updates)}`
      }
    });

    return NextResponse.json({ count: updated.count });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Failed to update tasks" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No task IDs provided" }, { status: 400 });
    }

    const deleted = await prisma.task.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({ count: deleted.count });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ error: "Failed to delete tasks" }, { status: 500 });
  }
}
