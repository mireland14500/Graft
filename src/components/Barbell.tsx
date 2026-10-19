/** Barbell icon. With `animated`, plates slide on and the bar lifts — used by the loading screen. */
export function Barbell({ className = "", animated = false }: { className?: string; animated?: boolean }) {
  const plate = (x: number, h: number, side: "l" | "r", delay: number) => (
    <rect
      x={x} y={20 - h / 2} width={5} height={h} rx={1.5} fill="currentColor"
      className={animated ? (side === "l" ? "animate-[plate-on-l_0.5s_cubic-bezier(0.2,0.7,0.2,1)_both]" : "animate-[plate-on-r_0.5s_cubic-bezier(0.2,0.7,0.2,1)_both]") : ""}
      style={animated ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
  return (
    <svg viewBox="0 0 100 40" className={className} aria-hidden>
      <g className={animated ? "animate-[bar-lift_1.6s_ease-in-out_0.9s_infinite]" : ""}>
        <rect x={4} y={18} width={92} height={4} rx={2} fill="currentColor" opacity={0.85} />
        {plate(12, 30, "l", 0)}
        {plate(19, 22, "l", 180)}
        {plate(83, 30, "r", 0)}
        {plate(76, 22, "r", 180)}
        <rect x={27} y={16} width={3} height={8} rx={1} fill="currentColor" />
        <rect x={70} y={16} width={3} height={8} rx={1} fill="currentColor" />
      </g>
    </svg>
  );
}
