"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Barbell } from "./Barbell";

/**
 * Lime progress bar along the top of the window with a barbell riding its tip.
 * Starts on any internal link click or form submit, finishes when the new page renders.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  // A new URL has rendered → complete the bar, then hide it.
  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    const t = setTimeout(() => setState((s) => (s === "done" ? "idle" : s)), 400);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setState("loading");
    };
    const onSubmit = () => setState("loading");
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  if (state === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1" aria-hidden>
      <div
        className={`relative h-full bg-brand shadow-[0_0_10px_#d4ff3a] ${state === "loading" ? "animate-[load-bar_8s_cubic-bezier(0.1,0.7,0.2,1)_forwards]" : "w-full opacity-0 transition-opacity duration-300"}`}
      >
        <Barbell className="absolute -right-4 -top-1.5 w-8 text-ink" />
      </div>
    </div>
  );
}
