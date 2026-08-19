import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { SeriesPoint } from "@/lib/finance-types";

export function Sparkline({ points, up }: { points: SeriesPoint[]; up: boolean }) {
  if (points.length < 2) return <div className="h-10 w-full" />;
  const color = up ? "var(--positive)" : "var(--negative)";
  const id = `spark-${up ? "up" : "down"}`;

  return (
    <div className="index-sparkline h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 6, right: 2, bottom: 1, left: 2 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.42} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="c"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id})`}
            activeDot={{ r: 3.5, fill: color, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={420}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
