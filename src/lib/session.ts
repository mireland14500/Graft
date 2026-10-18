import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** For server components / actions that need a signed-in user. */
export async function requireUser(callbackUrl = "/dashboard") {
  const session = await auth();
  if (!session?.user?.id) redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return session.user;
}

export async function requireCoach() {
  const user = await requireUser("/coach");
  if (user.role !== "COACH" && user.role !== "ADMIN") redirect("/coach/apply");
  return user;
}
