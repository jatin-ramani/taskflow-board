import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { avatar } = body; // base64 string from cropper

    if (!avatar) {
      return NextResponse.json({ error: "Avatar data is required" }, { status: 400 });
    }

    // Upload to Cloudinary
    // folder: "taskflow/avatars" to keep it organized
    const uploadResponse = await cloudinary.uploader.upload(avatar, {
      folder: "taskflow/avatars",
      public_id: `user_${session.user.id}`,
      overwrite: true,
    });

    const avatarUrl = uploadResponse.secure_url;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: avatarUrl },
      select: { id: true, name: true, email: true, avatar: true }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
  }
}
