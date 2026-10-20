import Link from "next/link";
import { Card } from "@/components/ui";

export default function CheckEmailPage() {
  return (
    <div className="mx-auto max-w-sm">
      <Card className="space-y-4 p-8 text-center">
        <p className="text-5xl">📬</p>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted">We&apos;ve sent you a sign-in link. Open it on this device to carry on — it may take a minute, and check your spam folder.</p>
        <Link href="/sign-in" className="inline-block text-sm font-semibold underline">Use a different email</Link>
      </Card>
    </div>
  );
}
