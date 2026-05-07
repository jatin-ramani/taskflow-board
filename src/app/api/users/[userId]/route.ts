import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { userId } = await params;

    if (session.user.id !== userId) return NextResponse.json({ error: "Can only edit own profile" }, { status: 403 });

    const { name } = await req.json();
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true, avatar: true, role: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT user error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
