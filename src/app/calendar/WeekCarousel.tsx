"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatKm, formatMinutes } from "@/lib/calendar";
import { SESSION_KINDS } from "@/lib/session-kinds";
import { WEEKDAYS } from "@/lib/sports";
import type { WorkoutDetail } from "@/lib/workout-details";

export interface CarouselWeek {
  start: Date;
  end: Date;
  /** e.g. "Week 3" or "Hyrox W3 · Yoga W1" when following two plans */
  label: string;
  days: { date: Date; workouts: WorkoutDetail[] }[];
  done: number;
  total: number;
  minutes: number;
  runMetres: number;
}

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Runna-style calendar: one week per swipe, compact session blocks, tap a block for its breakdown. */
export function WeekCarousel({ weeks, initialIndex, today, showPlan }: {
  weeks: CarouselWeek[]; initialIndex: number; today: Date; showPlan: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const [selected, setSelected] = useState<WorkoutDetail | null>(null);

  const goTo = useCallback((i: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.min(Math.max(i, 0), weeks.length - 1);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
    setIndex(clamped);
  }, [weeks.length]);

  // Open on the current week without animating.
  useEffect(() => goTo(initialIndex, false), [goTo, initialIndex]);

  // Keep the header in sync when the athlete swipes.
  const onScroll = () => {
    const el = scroller.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  // If the layout resizes (rotation, window resize), stay aligned to the current week.
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => el.scrollTo({ left: indexRef.current * el.clientWidth, behavior: "instant" }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (selected) return;
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index, selected]);

  const week = weeks[index];
  const chips = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chips.current?.querySelector(`[data-week="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white">
      {/* Week header */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous week"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg disabled:opacity-30">‹</button>
        <div className="flex-1 text-center">
          <p className="font-bold">
            {dayMonth.format(week.start)} – {dayMonth.format(week.end)}{" "}
            <span className="ml-1 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-brand">{week.label}</span>
          </p>
          <p className="text-xs text-muted">
            {week.done}/{week.total} sessions · {formatMinutes(week.minutes)}{week.runMetres > 0 && ` · ${formatKm(week.runMetres)}`}
          </p>
        </div>
        <button onClick={() => goTo(index + 1)} disabled={index === weeks.length - 1} aria-label="Next week"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg disabled:opacity-30">›</button>
      </div>

      {/* Jump to any week */}
      <div ref={chips} className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2 [scrollbar-width:none]">
        {weeks.map((w, i) => {
          const complete = w.total > 0 && w.done === w.total;
          return (
            <button key={i} data-week={i} onClick={() => goTo(i)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${i === index ? "bg-ink text-white" : complete ? "bg-brand/50 text-brand-ink" : "bg-paper text-muted hover:text-ink"}`}>
              W{i + 1}{complete && " ✓"}
            </button>
          );
        })}
      </div>

      {/* One week per page, swipeable */}
      <div ref={scroller} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
        {weeks.map((w, wi) => (
          <div key={wi} className="w-full shrink-0 snap-start px-3 py-2" inert={wi !== index}>
            {w.days.map((day, di) => {
              const isToday = day.date.getTime() === today.getTime();
              return (
                <div key={di} className={`flex items-center gap-3 py-1.5 ${di > 0 ? "border-t border-line/60" : ""}`}>
                  <div className="w-10 shrink-0 text-center">
                    <p className={`text-[10px] font-semibold uppercase ${isToday ? "text-ink" : "text-muted"}`}>{WEEKDAYS[di]}</p>
                    <p className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${isToday ? "bg-brand text-brand-ink" : ""}`}>
                      {day.date.getUTCDate()}
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1 sm:flex-row">
                    {day.workouts.length === 0 && <p className="py-2 text-xs text-muted">Rest</p>}
                    {day.workouts.map((wo) => {
                      const style = SESSION_KINDS[wo.kind];
                      const missed = !wo.completed && day.date < today;
                      return (
                        <button key={wo.id} onClick={() => setSelected(wo)}
                          className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:brightness-95 active:scale-[0.98] ${style.chip}`}>
                          <span className={`w-1 self-stretch rounded-full ${style.bar}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-bold leading-tight">{wo.title}</span>
                            <span className="block truncate text-[11px] opacity-75">
                              {wo.runMetres > 0 ? `${formatKm(wo.runMetres)} · ` : ""}{wo.estMinutes} min{showPlan && ` · ${wo.planTitle}`}
                            </span>
                          </span>
                          {wo.completed && <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white" aria-label="Completed">✓</span>}
                          {missed && <span className="shrink-0 text-[10px] font-semibold text-amber-700">Missed</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {selected && <WorkoutSheet workout={selected} today={today} onClose={() => setSelected(null)} />}
    </div>
  );
}

/** Bottom sheet (phone) / side panel (desktop) with the full breakdown of one session. */
function WorkoutSheet({ workout: w, today, onClose }: { workout: WorkoutDetail; today: Date; onClose: () => void }) {
  const style = SESSION_KINDS[w.kind];
  const upcoming = w.date >= today;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 backdrop-blur-sm md:items-stretch md:justify-end" onClick={onClose}>
      <div role="dialog" aria-modal aria-label={w.title} onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-[pop-in_0.25s_ease-out] md:max-h-none md:max-w-md md:rounded-none md:rounded-l-3xl">
        <div className={`relative px-6 pb-5 pt-6 ${style.chip}`}>
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/70 text-lg">×</button>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{longDate.format(w.date)} · Week {w.weekNumber}</p>
          <p className="mt-1 pr-8 text-2xl font-black leading-tight">{w.title}</p>
          <p className="mt-1 text-sm opacity-80">{w.planTitle}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/70 px-2.5 py-1">{style.label}</span>
            <span className="rounded-full bg-white/70 px-2.5 py-1">~{w.estMinutes} min</span>
            {w.runMetres > 0 && <span className="rounded-full bg-white/70 px-2.5 py-1">{formatKm(w.runMetres)}</span>}
            {w.completed && <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-white">✓ Done</span>}
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">What to do</p>
            <p className="mt-1 text-sm leading-relaxed">{w.guidance}</p>
            {w.notes && <p className="mt-2 text-sm leading-relaxed text-muted">{w.notes}</p>}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">The session</p>
            <ol className="mt-2 space-y-2">
              {w.steps.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-line p-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{s.name}</p>
                    <p className="text-sm">{s.prescription}</p>
                    {s.notes && <p className="text-xs text-muted">{s.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="border-t border-line p-4">
          <Link href={`/workout/${w.id}`} className="block rounded-full bg-ink py-3 text-center font-semibold text-white hover:bg-black">
            {w.completed ? "View or edit your log" : upcoming ? "Open workout" : "Log this workout"}
          </Link>
        </div>
      </div>
    </div>
  );
}
