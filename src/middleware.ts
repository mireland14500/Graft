import { NextResponse, type NextRequest } from "next/server";
import { REF_COOKIE } from "./lib/cookies";

/** Remember ?ref=<coach-slug> for 30 days so the gym/PT gets credit when the visitor signs up. */
export function middleware(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  const res = NextResponse.next();
  if (ref && /^[a-z0-9-]{1,80}$/.test(ref) && !req.cookies.has(REF_COOKIE)) {
    res.cookies.set(REF_COOKIE, ref, { maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true });
  }
  return res;
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
