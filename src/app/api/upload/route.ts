import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { requireUser, toErrorResponse, HttpError } from "@/lib/authz";

export const runtime = "nodejs";

// POST /api/upload — upload an image (multipart "file") to Cloudinary, return its URL.
export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file provided");
    if (!file.type.startsWith("image/")) {
      throw new HttpError(400, "Only images are supported");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new HttpError(400, "Image must be under 10MB");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;

    try {
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: "taskflow/chat",
        transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
      });
      return NextResponse.json({ url: result.secure_url });
    } catch {
      throw new HttpError(502, "Upload failed. Check Cloudinary config.");
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
