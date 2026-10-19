"use client";

import { useEffect, useState } from "react";
import { SportPhoto } from "./SportPhoto";

/** Cross-fading full-bleed slides with a slow Ken Burns zoom on the active one. */
export function HeroSlideshow({ slides, interval = 5500 }: { slides: { slot: string; src: string | null; label: string }[]; interval?: number }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((n) => (n + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [slides.length, interval]);

  return (
    <div className="absolute inset-0">
      {slides.map((s, i) => (
        <div key={s.slot} className={`absolute inset-0 transition-opacity duration-[1400ms] ${i === active ? "opacity-100" : "opacity-0"}`}>
          <div className={`absolute inset-0 ${i === active ? "animate-[kenburns_7s_ease-out_forwards]" : ""}`}>
            <SportPhoto slot={s.slot} src={s.src} label={s.label} priority={i === 0} />
          </div>
        </div>
      ))}
      {/* Readability: darken the left where the headline sits */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
      <div className="absolute bottom-8 right-6 flex gap-2">
        {slides.map((s, i) => (
          <button
            key={s.slot}
            onClick={() => setActive(i)}
            aria-label={`Show ${s.label}`}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-8 bg-brand" : "w-3 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
