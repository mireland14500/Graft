"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { ProjectionPoint } from "@/lib/engine/projections";
import { formatBenchmark } from "@/lib/engine/units";

export function ProjectionChart({
  points,
  unit,
  better,
  actual = [],
  height = 260,
}: {
  points: ProjectionPoint[];
  unit: "kg" | "time";
  better: "higher" | "lower";
  /** Logged results, plotted as dots against the projection */
  actual?: { week: number; value: number }[];
  height?: number;
}) {
  const byWeek = new Map(actual.map((a) => [a.week, a.value]));
  const data = points.map((p) => ({ week: p.week, expected: p.expected, band: [p.low, p.high], actual: byWeek.get(p.week) }));
  const fmt = (v: number) => formatBenchmark(unit, v);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="week" tickFormatter={(w) => `W${w}`} tick={{ fontSize: 12 }} />
        {/* For times, flip the axis so "up" always means "better" */}
        <YAxis reversed={better === "lower"} domain={["auto", "auto"]} tickFormatter={fmt} tick={{ fontSize: 12 }} width={70} />
        <Tooltip
          formatter={(value, name) =>
            Array.isArray(value) ? [value.map(Number).sort((x, y) => x - y).map(fmt).join(" – "), "Likely range"] : [fmt(Number(value)), name === "actual" ? "Logged" : "Expected"]
          }
          labelFormatter={(w) => `Week ${w}`}
          itemStyle={{ color: "#0f1115" }}
        />
        <Area dataKey="band" stroke="none" fill="#d4ff3a" fillOpacity={0.45} isAnimationActive={false} />
        <Line dataKey="expected" stroke="#0f1115" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Scatter dataKey="actual" fill="#0f1115" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
