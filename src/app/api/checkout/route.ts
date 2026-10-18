import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { paymentsEnabled } from "@/lib/access";
import { TRIAL_DAYS } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { appUrl, stripe } from "@/lib/stripe";

/**
 * GET /api/checkout?kind=subscription|purchase&planId=…&request=…
 * Sends the athlete to Stripe Checkout, then back to their recommendations to enrol.
 */
export async function GET(req: NextRequest) {
  if (!paymentsEnabled()) return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/sign-in", req.url));
  const { searchParams } = req.nextUrl;
  const kind = searchParams.get("kind");
  const planId = searchParams.get("planId") ?? "";
  const back = appUrl(`/plans/recommended?request=${searchParams.get("request") ?? ""}`);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, include: { subscription: true } });
  const metadata = { userId: user.id, planId };
  const customer = user.subscription?.stripeCustomerId;

  if (kind === "subscription") {
    const checkout = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_MONTHLY!, quantity: 1 }],
      subscription_data: { trial_period_days: TRIAL_DAYS, metadata },
      ...(customer ? { customer } : { customer_email: user.email }),
      metadata,
      success_url: back,
      cancel_url: back,
    });
    return NextResponse.redirect(checkout.url!, 303);
  }

  if (kind === "purchase") {
    const plan = await prisma.planTemplate.findUniqueOrThrow({ where: { id: planId } });
    const checkout = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: "gbp", unit_amount: plan.priceCents ?? 0, product_data: { name: plan.title } } }],
      ...(customer ? { customer } : { customer_email: user.email }),
      metadata,
      success_url: back,
      cancel_url: back,
    });
    return NextResponse.redirect(checkout.url!, 303);
  }

  return NextResponse.json({ error: "Unknown checkout kind" }, { status: 400 });
}
