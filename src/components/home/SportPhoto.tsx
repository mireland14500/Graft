import Image from "next/image";

/** Designed stand-in shown until a real photo is dropped into public/images/home/. */
const FALLBACKS: Record<string, string> = {
  hyrox: "from-lime-400 via-emerald-600 to-ink",
  crossfit: "from-orange-400 via-rose-600 to-ink",
  powerlifting: "from-indigo-400 via-violet-700 to-ink",
  running: "from-sky-400 via-cyan-700 to-ink",
  bodybuilding: "from-fuchsia-400 via-purple-700 to-ink",
  yoga: "from-cyan-300 via-teal-600 to-ink",
  pilates: "from-pink-300 via-fuchsia-600 to-ink",
  coach: "from-amber-300 via-orange-600 to-ink",
};

export function SportPhoto({ slot, src, label, priority = false, sizes = "100vw", className = "" }: {
  slot: string; src: string | null; label: string; priority?: boolean; sizes?: string; className?: string;
}) {
  if (src) {
    return <Image src={src} alt={label} fill priority={priority} sizes={sizes} className={`object-cover ${className}`} />;
  }
  return (
    <div aria-hidden className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${FALLBACKS[slot] ?? FALLBACKS.coach} ${className}`}>
      <div className="absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(135deg,#fff_0_2px,transparent_2px_14px)]" />
      <span className="absolute -bottom-4 -left-2 select-none text-[22vw] font-black uppercase leading-none tracking-tighter text-white/15 md:text-[9rem]">
        {label}
      </span>
    </div>
  );
}
