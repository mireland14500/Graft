import { Barbell } from "@/components/Barbell";

/** Shown by Next.js while any page's data loads. */
export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-live="polite">
      <div className="flex w-64 flex-col items-center gap-5">
        <Barbell animated className="w-40 text-ink" />
        <div className="h-2 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/3 rounded-full bg-brand animate-[indeterminate_1.1s_ease-in-out_infinite]" />
        </div>
        <p className="text-sm font-semibold text-muted">Loading the bar…</p>
      </div>
    </div>
  );
}
