import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REQUIRED = ["DATABASE_URL", "AUTH_SECRET", "AUTH_TRUST_HOST", "AUTH_RESEND_KEY", "EMAIL_FROM", "APP_URL", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"] as const;

/** Deployment check: which settings this deployment can see (yes/no only, never the values). */
export function GET() {
  return NextResponse.json({
    environment: process.env.VERCEL_ENV ?? "local",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    settings: Object.fromEntries(REQUIRED.map((k) => [k, process.env[k] ? "set" : "MISSING"])),
  });
}
