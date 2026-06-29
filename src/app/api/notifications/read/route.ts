import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, toErrorResponse } from "@/lib/authz";

// POST /api/notifications/read — mark some (by ids) or all notifications read.
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;

    await prisma.notification.updateMany({
      where: {
        recipientId: me.id,
        isRead: false,
        ...(ids ? { id: { in: ids } } : {}),
      },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
