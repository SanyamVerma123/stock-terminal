import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Candle } from "@/lib/finance-normalize";
import { fmtPrice } from "@/lib/format";

function shortDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function fullDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); }

export function StockPriceChart({ symbol, points, currency }: { symbol: string; points: Candle[]; currency?: string | null | undefined }) {
  const id = useId().replace(/:/g, "");
  const data = useMemo(() => points.filter(point => Number.isFinite(point.c)).map(point => ({ ...point, label: shortDate(point.t), fullDate: fullDate(point.t) })), [points]);
  const first = data[0]?.c ?? null;
  const last = data.at(-1)?.c ?? null;
  const up = first !== null && last !== null ? last >= first : true;
  const color = up ? "var(--positive)" : "var(--negative)";
  if (data.length < 2) return <div className="stock-chart-empty">Price history will appear when sufficient market data is available.</div>;
  return <div className="stock-price-chart"><div className="stock-chart-meta"><span><i className={up ? "up" : "down"}/>{symbol} close performance <small>Hover a point for its closing price</small></span><b>{first !== null && last !== null ? `${((last / first - 1) * 100).toFixed(2)}%` : "—"}</b></div><div className="h-[250px] w-full sm:h-[365px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 18, right: 6, left: -4, bottom: 0 }}><defs><linearGradient id={`stock-fill-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.28}/><stop offset="92%" stopColor={color} stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.45} strokeDasharray="3 6"/><XAxis dataKey="label" minTickGap={32} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}/><YAxis domain={["auto", "auto"]} width={52} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={value => fmtPrice(Number(value), currency)}/><Tooltip cursor={{ stroke: "var(--primary)", strokeOpacity: 0.45, strokeDasharray: "3 4" }} allowEscapeViewBox={{ x: false, y: false }} reverseDirection={{ x: true, y: true }} offset={8} wrapperStyle={{ maxWidth: "calc(100% - 12px)" }} content={({ active, payload }) => { const point = payload?.[0]?.payload as { fullDate?: string; c?: number; o?: number; h?: number; l?: number } | undefined; return active && point && typeof point.c === "number" ? <div className="stock-close-tooltip"><small>{point.fullDate}</small><b>Close <span>{fmtPrice(point.c, currency)}</span></b>{typeof point.o === "number" ? <p>Open {fmtPrice(point.o, currency)}</p> : null}{typeof point.h === "number" && typeof point.l === "number" ? <p>Range {fmtPrice(point.l, currency)} – {fmtPrice(point.h, currency)}</p> : null}</div> : null; }}/><Area type="monotone" dataKey="c" stroke={color} strokeWidth={2.25} fill={`url(#stock-fill-${id})`} activeDot={{ r: 5, strokeWidth: 3, stroke: "var(--card)", fill: color }} isAnimationActive animationDuration={480}/></AreaChart></ResponsiveContainer></div></div>;
}
