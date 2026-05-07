import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) return NextResponse.json({ projects: [], tasks: [] });

    const [projects, tasks] = await Promise.all([
      prisma.project.findMany({
        where: {
          name: { contains: query, mode: "insensitive" },
          members: { some: { userId: session.user.id } }
        },
        take: 5
      }),
      prisma.task.findMany({
        where: {
          title: { contains: query, mode: "insensitive" },
          OR: [
            { assigneeId: session.user.id },
            { creatorId: session.user.id },
            { project: { members: { some: { userId: session.user.id } } } }
          ]
        },
        take: 10,
        include: { project: { select: { name: true, color: true } } }
      })
    ]);

    return NextResponse.json({ projects, tasks });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
