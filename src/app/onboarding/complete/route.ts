import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { planRequestSchema } from "@/lib/validation";
import { PENDING_REQUEST_COOKIE, REF_COOKIE } from "@/lib/cookies";
import { savePlanRequest } from "@/lib/plan-requests";

/** Lands here after sign-in: persist the answers parked in the cookie. */
export async function GET(req: NextRequest) {
  const session = await auth();
  const pending = req.cookies.get(PENDING_REQUEST_COOKIE)?.value;
  if (!session?.user?.id) return NextResponse.redirect(new URL("/sign-in", req.url));
  if (!pending) return NextResponse.redirect(new URL("/onboarding", req.url));

  const parsed = planRequestSchema.safeParse(JSON.parse(pending));
  if (!parsed.success) return NextResponse.redirect(new URL("/onboarding", req.url));

  const request = await savePlanRequest(session.user.id, parsed.data, req.cookies.get(REF_COOKIE)?.value);
  const res = NextResponse.redirect(new URL(`/plans/recommended?request=${request.id}`, req.url));
  res.cookies.delete(PENDING_REQUEST_COOKIE);
  return res;
}
