import Link from "next/link";
import { auth, signOut } from "@/auth";
import { APP_NAME } from "@/lib/brand";

export async function Nav() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="border-b border-line bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-black tracking-tight">
          {APP_NAME.toUpperCase()}<span className="text-brand-ink">.</span>
        </Link>
        <div className="order-last flex w-full gap-5 overflow-x-auto whitespace-nowrap text-sm text-muted sm:order-none sm:w-auto">
          <Link href="/plans" className="hover:text-ink">Plans</Link>
          {user && <Link href="/dashboard" className="hover:text-ink">Training</Link>}
          {user && <Link href="/calendar" className="hover:text-ink">Calendar</Link>}
          {user && <Link href="/progress" className="hover:text-ink">Progress</Link>}
          <Link href="/coach" className="hover:text-ink">For coaches</Link>
        </div>
        <div className="ml-auto text-sm">
          {user ? (
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button className="text-muted hover:text-ink">Sign out</button>
            </form>
          ) : (
            <Link href="/sign-in" className="font-semibold">Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
