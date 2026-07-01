import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar,
          publicId: user.publicId,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role ?? "MEMBER";
        token.publicId = user.publicId as string;
        token.username = user.username ?? null;
        token.picture = user.image ?? null;
        token.refreshedAt = Date.now();
      }
      if (trigger === "update" && session?.user) {
        token.picture = session.user.image ?? token.picture;
        token.name = session.user.name ?? token.name;
        token.username = session.user.username ?? token.username;
        token.refreshedAt = Date.now();
      }
      // Periodically re-sync mutable profile fields from the DB so an avatar /
      // name change made in one session (or on another device) shows up in every
      // session — without forcing a re-login. Throttled to limit DB hits.
      const refreshedAt = (token.refreshedAt as number | undefined) ?? 0;
      if (token.id && Date.now() - refreshedAt > 60_000) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { avatar: true, name: true, username: true },
        });
        if (fresh) {
          token.picture = fresh.avatar ?? null;
          token.name = fresh.name;
          token.username = fresh.username ?? null;
        }
        token.refreshedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.publicId = token.publicId;
        session.user.username = token.username;
        session.user.image = token.picture ?? null;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
