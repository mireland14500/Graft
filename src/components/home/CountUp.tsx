"use client";

import { useEffect, useState } from "react";
import { useInView } from "./Reveal";

/** Counts from `from` to `to` once visible. `step` rounds the displayed value (e.g. 2.5 for barbell loads). */
export function CountUp({ from, to, step = 1, duration = 1600, suffix = "" }: { from: number; to: number; step?: number; duration?: number; suffix?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round((from + (to - from) * eased) / step) * step);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, from, to, step, duration]);

  return <span ref={ref} className="tabular-nums">{value}{suffix}</span>;
}
