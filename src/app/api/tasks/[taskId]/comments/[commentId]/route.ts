import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string, commentId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { commentId } = await params;
    const { content } = await req.json();

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (comment.authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ taskId: string, commentId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { commentId } = await params;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (comment.authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.comment.delete({ where: { id: commentId } });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
