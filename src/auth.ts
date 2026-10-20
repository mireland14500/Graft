import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google verifies email addresses, so it's safe to attach a Google login to an
    // existing account with the same email (e.g. someone who first signed up by email link).
    ...(process.env.AUTH_GOOGLE_ID ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
    Resend({ from: process.env.EMAIL_FROM }),
  ],
  session: { strategy: "database" },
  // Errors and the "check your email" step stay inside the app instead of Auth.js's default pages
  pages: { signIn: "/sign-in", error: "/sign-in", verifyRequest: "/sign-in/check-email" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as { role?: string }).role ?? "ATHLETE";
      return session;
    },
  },
});
