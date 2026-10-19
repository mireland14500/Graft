import { signIn } from "@/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui";
import { APP_NAME } from "@/lib/brand";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl = "/dashboard" } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <Card className="space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold">Sign in to {APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted">We&apos;ll save your answers and build your plan.</p>
        </div>
        <form action={async () => { "use server"; await signIn("google", { redirectTo: callbackUrl }); }}>
          <SubmitButton variant="ghost" className="w-full" pendingText="Opening Google…">Continue with Google</SubmitButton>
        </form>
        <div className="text-center text-xs text-muted">or</div>
        <form
          className="space-y-3"
          action={async (fd: FormData) => {
            "use server";
            await signIn("resend", { email: fd.get("email"), redirectTo: callbackUrl });
          }}
        >
          <input name="email" type="email" required placeholder="you@example.com" className="w-full rounded-xl border border-line px-4 py-2.5" />
          <SubmitButton className="w-full" pendingText="Sending your link…">Email me a sign-in link</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
