"use client";

import { useEffect, useState } from "react";

/** Cycles through words with a slide-up swap, e.g. "Hyrox" → "CrossFit" → … */
export function RotatingWord({ words, interval = 2200, className = "" }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);

  return (
    <span className="inline-block overflow-hidden align-bottom">
      <span key={i} className={`inline-block animate-[word-in_0.55s_cubic-bezier(0.2,0.7,0.2,1)] ${className}`}>
        {words[i]}
      </span>
    </span>
  );
}
