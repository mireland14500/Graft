import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { APP_NAME, CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/brand";

export const metadata: Metadata = { title: `Privacy policy — ${APP_NAME}` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated={LEGAL_UPDATED}>
      <p>
        This policy explains what information {APP_NAME} collects when you use the app, why we collect it, and the choices you have.
        If you have any questions, email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details</b> — your name, email address and profile picture, from the email link or Google account you sign in with.</li>
        <li><b>Training answers</b> — the sport, goals, experience, available days, equipment and current numbers (such as lifts, race times and bodyweight) you enter when choosing a plan.</li>
        <li><b>Training logs</b> — the sets, weights, distances, times, effort ratings and notes you record for each session.</li>
        <li><b>Coach details</b> — if you apply as a coach: your display name, gym, bio and the plans you upload.</li>
        <li><b>Payments</b> — handled by Stripe. We never see or store your card details; we keep a record of your subscription status and purchases.</li>
        <li><b>Technical data</b> — basic logs (such as IP address, browser type and pages requested) kept by our hosting provider to run and secure the service.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create your account and sign you in.</li>
        <li>To match you to plans, schedule your sessions and personalise weights and paces to your numbers.</li>
        <li>To show your progress and estimate where your numbers are heading.</li>
        <li>To take subscription payments and pay coaches their share.</li>
        <li>To keep the service secure and fix problems.</li>
      </ul>
      <p>We do not sell your personal information, and we do not use it for advertising.</p>

      <h2>Who we share it with</h2>
      <p>Only the companies that help us run {APP_NAME}, and only what they need to do that:</p>
      <ul>
        <li><b>Vercel</b> — hosts the app.</li>
        <li><b>Neon</b> — stores the database.</li>
        <li><b>Resend</b> — sends sign-in emails.</li>
        <li><b>Google</b> — if you choose to sign in with Google.</li>
        <li><b>Stripe</b> — processes payments and coach payouts.</li>
      </ul>
      <p>
        Coaches see how many athletes are following their plans, not your personal details or training logs.
        We may also disclose information if the law requires it.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies needed to run the app: one that keeps you signed in, one that remembers your answers while you sign in,
        and one that records which coach or gym referred you, if any. We don&apos;t use advertising or tracking cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account and training history while your account is open, so your progress is there when you come back.
        If you ask us to delete your account, we delete your personal information, except records we must keep by law (such as payment records).
      </p>

      <h2>Your rights</h2>
      <p>
        Under UK data protection law you can ask to see the information we hold about you, correct it, delete it, or receive a copy of it.
        Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&apos;ll respond within one month.
        If you&apos;re unhappy with how we handle your data, you can complain to the Information Commissioner&apos;s Office (ico.org.uk).
      </p>

      <h2>Children</h2>
      <p>{APP_NAME} is for people aged 16 and over. We don&apos;t knowingly collect information from anyone younger.</p>

      <h2>Changes</h2>
      <p>If we change this policy we&apos;ll update the date at the top, and tell you in the app or by email if the changes are significant.</p>
    </LegalPage>
  );
}
