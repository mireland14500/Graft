import { NextResponse } from "next/server";
import { paymentsEnabled } from "@/lib/access";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/session";
import { appUrl, stripe } from "@/lib/stripe";

/** Creates (once) a Stripe Connect Express account for the coach and sends them to onboarding. */
export async function GET() {
  if (!paymentsEnabled()) return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  const user = await requireCoach();
  const coach = await prisma.coachProfile.findUniqueOrThrow({ where: { userId: user.id } });

  let accountId = coach.stripeAccountId;
  if (!accountId) {
    const account = await stripe().accounts.create({ type: "express", email: user.email ?? undefined, metadata: { coachId: coach.id } });
    accountId = account.id;
    await prisma.coachProfile.update({ where: { id: coach.id }, data: { stripeAccountId: accountId } });
  }

  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: appUrl("/api/coach/connect"),
    return_url: appUrl("/coach"),
  });
  return NextResponse.redirect(link.url, 303);
}
