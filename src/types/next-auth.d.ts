import type { DefaultSession } from "next-auth";

type Role = "ADMIN" | "MEMBER";

declare module "next-auth" {
  interface User {
    role?: Role;
    publicId?: string;
    username?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      publicId: string;
      username: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    publicId: string;
    username: string | null;
  }
}
