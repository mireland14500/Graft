import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui";
import { APP_NAME } from "@/lib/brand";

const ERRORS: Record<string, string> = {
  EmailSignInError: "We couldn't send your sign-in email. Check the address is right and try again in a moment.",
  Configuration: "We couldn't send your sign-in email right now. Please try again in a moment.",
  Verification: "That sign-in link has expired or was already used. Request a new one below.",
  AccessDenied: "That account isn't allowed to sign in.",
};

/** Turn Auth.js failures into a message on this page; let its success redirect through. */
async function attempt(provider: string, options: Record<string, unknown>, callbackUrl: string) {
  try {
    await signIn(provider, { ...options, redirectTo: callbackUrl });
  } catch (e) {
    if (e instanceof AuthError) {
      console.error("[sign-in]", e.type, e.cause ?? e.message);
      // Any failure while sending the email link gets the email message, whatever Auth.js calls it
      const type = provider === "resend" && e.type !== "Verification" ? "EmailSignInError" : e.type;
      redirect(`/sign-in?error=${type}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw e;
  }
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl = "/dashboard", error } = await searchParams;
  const googleEnabled = !!process.env.AUTH_GOOGLE_ID;

  return (
    <div className="mx-auto max-w-sm">
      <Card className="space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold">Sign in to {APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted">We&apos;ll save your answers and build your plan.</p>
        </div>
        {error && (
          <Card tone="error" className="p-3 text-sm">{ERRORS[error] ?? "Something went wrong signing you in. Please try again."}</Card>
        )}
        {googleEnabled && (
          <>
            <form action={async () => { "use server"; await attempt("google", {}, callbackUrl); }}>
              <SubmitButton variant="ghost" className="w-full" pendingText="Opening Google…">Continue with Google</SubmitButton>
            </form>
            <div className="text-center text-xs text-muted">or</div>
          </>
        )}
        <form
          className="space-y-3"
          action={async (fd: FormData) => {
            "use server";
            await attempt("resend", { email: fd.get("email") }, callbackUrl);
          }}
        >
          <input name="email" type="email" required placeholder="you@example.com" className="w-full rounded-xl border border-line px-4 py-2.5" />
          <SubmitButton className="w-full" pendingText="Sending your link…">Email me a sign-in link</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
