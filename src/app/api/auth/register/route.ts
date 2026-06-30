import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { generateUniquePublicId } from "@/lib/ids";
import { HttpError, toErrorResponse } from "@/lib/authz";

// POST /api/auth/register — create account + a "Personal" project with default sections.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0].message);
    }

    const { name, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new HttpError(409, "An account with this email already exists");
    }

    const publicId = await generateUniquePublicId();
    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        publicId,
        ownedProjects: {
          create: {
            name: "Personal",
            isPersonal: true,
            color: "#5b5fc7",
            icon: "user",
            sections: {
              create: [
                { name: "Todo", position: 0 },
                { name: "In Progress", position: 1 },
                { name: "Done", position: 2 },
              ],
            },
          },
        },
      },
      select: { id: true, publicId: true },
    });

    return NextResponse.json(
      { id: user.id, publicId: user.publicId },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
