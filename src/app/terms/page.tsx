import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { APP_NAME, CONTACT_EMAIL, LEGAL_UPDATED, MONTHLY_PRICE_PENCE, formatPence } from "@/lib/brand";

export const metadata: Metadata = { title: `Terms of use — ${APP_NAME}` };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated={LEGAL_UPDATED}>
      <p>By creating an account or using {APP_NAME}, you agree to these terms. Questions: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

      <h2>Train safely</h2>
      <p>
        {APP_NAME} provides general training plans, not medical advice. Check with a doctor before starting a new programme, especially if you
        have an injury or health condition. Stop and seek advice if something hurts. You train at your own risk.
      </p>

      <h2>Estimates are estimates</h2>
      <p>
        Projections, race-time predictions and estimated maxes are based on typical progress and your own logs. They&apos;re there to guide
        and motivate you — they aren&apos;t promises of any result.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 16 or over.</li>
        <li>Keep your sign-in secure; you&apos;re responsible for activity on your account.</li>
        <li>Don&apos;t misuse the service, try to break it, or upload anything unlawful or that you don&apos;t have the rights to.</li>
      </ul>

      <h2>Subscriptions</h2>
      <p>
        A subscription costs {formatPence(MONTHLY_PRICE_PENCE)} per month for each plan you follow at the same time, after any free trial.
        It renews automatically until you cancel, and you can cancel at any time — you keep access until the end of the period you&apos;ve paid for.
        Premium plans are one-off purchases. Prices may change; we&apos;ll tell you in advance.
      </p>

      <h2>Coaches and their plans</h2>
      <p>
        Plans are written by independent coaches, PTs and gyms. We review plans before publishing them, but coaches are responsible for their
        own content. Coaches agree to only upload programmes they own or have permission to share.
      </p>

      <h2>Ending your account</h2>
      <p>You can stop using {APP_NAME} at any time and ask us to delete your account. We may suspend accounts that break these terms.</p>

      <h2>Liability</h2>
      <p>
        We work hard to keep {APP_NAME} running and accurate, but we provide it &quot;as is&quot;. To the extent the law allows, we aren&apos;t
        liable for indirect losses, or for injuries arising from training. Nothing in these terms limits liability that can&apos;t be limited by law.
      </p>

      <h2>General</h2>
      <p>These terms are governed by the laws of England and Wales. If we update them, we&apos;ll change the date at the top and let you know about significant changes.</p>
    </LegalPage>
  );
}
