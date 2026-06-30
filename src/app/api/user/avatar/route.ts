import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { requireUser, toErrorResponse, HttpError } from "@/lib/authz";

export const runtime = "nodejs";

// POST /api/user/avatar — upload an avatar image (multipart "file"), store on Cloudinary.
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No image provided");
    if (!file.type.startsWith("image/")) {
      throw new HttpError(400, "File must be an image");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new HttpError(400, "Image must be under 5MB");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;

    let url: string;
    try {
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: "taskflow/avatars",
        public_id: me.id,
        overwrite: true,
        transformation: [
          { width: 256, height: 256, crop: "fill", gravity: "face" },
        ],
      });
      url = result.secure_url;
    } catch {
      throw new HttpError(502, "Image upload failed. Check Cloudinary config.");
    }

    await prisma.user.update({ where: { id: me.id }, data: { avatar: url } });
    return NextResponse.json({ url });
  } catch (err) {
    return toErrorResponse(err);
  }
}
