import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { avatar } = body; // base64 string

    if (!avatar) {
      return NextResponse.json({ error: "Avatar data is required" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar },
      select: { id: true, name: true, email: true, avatar: true }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
  }
}
