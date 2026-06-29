import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

// Unambiguous alphabet — no 0/O, 1/I/L to avoid confusion when read aloud.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DEFAULT_LEN = 6;

/** Generate a random friend code, e.g. "K7M2QX". */
export function makePublicId(len = DEFAULT_LEN): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Generate a friend code guaranteed unique against the DB. */
export async function generateUniquePublicId(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const id = makePublicId();
    const existing = await prisma.user.findUnique({
      where: { publicId: id },
      select: { id: true },
    });
    if (!existing) return id;
  }
  // Astronomically unlikely fallback: widen the space.
  return makePublicId(8);
}
