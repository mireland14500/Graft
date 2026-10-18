import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const buttonStyles = {
  primary: "bg-ink text-white hover:bg-black",
  brand: "bg-brand text-brand-ink hover:brightness-95",
  ghost: "border border-line bg-white hover:bg-paper",
} as const;

type Variant = keyof typeof buttonStyles;
const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50";

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${buttonStyles[variant]} ${className}`} {...props} />;
}

export function LinkButton({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${buttonStyles[variant]} ${className}`} {...props} />;
}

const cardTones = {
  default: "border-line bg-white",
  dark: "border-ink bg-ink text-white",
  brand: "border-transparent bg-brand/30",
  error: "border-red-200 bg-red-50 text-red-800",
} as const;

export function Card({ className = "", tone = "default", children }: { className?: string; tone?: keyof typeof cardTones; children: ReactNode }) {
  return <div className={`rounded-2xl border p-5 ${cardTones[tone]} ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" }) {
  const tones = { neutral: "bg-paper text-ink", good: "bg-brand/40 text-brand-ink", warn: "bg-amber-100 text-amber-900" };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
