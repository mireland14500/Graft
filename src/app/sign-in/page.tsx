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
  OAuthAccountNotLinked: "That email is already registered another way — sign in with the email link instead.",
  OAuthCallbackError: "Google sign-in was cancelled or didn't complete. Please try again.",
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
              <SubmitButton variant="ghost" className="w-full" pendingText="Opening Google…"><GoogleLogo /> Continue with Google</SubmitButton>
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

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
