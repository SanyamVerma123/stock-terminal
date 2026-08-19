import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { SiteHeader } from "@/components/finance/SiteHeader";
import { getCompare } from "@/lib/finance.functions";
import { DataLoading } from "@/components/ui/loading-state";
import { X } from "lucide-react";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare Stocks Side by Side — Screener" },
      { name: "description", content: "Normalize and compare the performance of multiple tickers over any period." },
      { property: "og:title", content: "Compare Stocks Side by Side — Screener" },
      { property: "og:description", content: "Rebased performance comparison across multiple tickers." },
    ],
  }),
  component: ComparePage,
});

const COLORS = ["var(--primary)", "var(--positive)", "var(--negative)", "var(--chart-4)", "var(--chart-5)"];

function ComparePage() {
  const [input, setInput] = useState("RELIANCE.NS, TCS.NS, INFY.NS");
  const [symbols, setSymbols] = useState("RELIANCE.NS,TCS.NS,INFY.NS");
  const compare = useServerFn(getCompare);

  const { data, isFetching } = useQuery({
    queryKey: ["compare", symbols],
    queryFn: () => compare({ data: { symbols, period: "1y", interval: "1d" } }),
    staleTime: 120_000,
  });

  const series = data ?? [];
  const merged = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    const base = s.points[0]?.c;
    if (!base) continue;
    for (const p of s.points) {
      const row = merged.get(p.t) ?? { t: p.t };
      row[s.symbol] = ((p.c / base - 1) * 100).toFixed(2) as unknown as number;
      merged.set(p.t, row);
    }
  }
  const rows = Array.from(merged.values());
  const snapshots = series.map((entry) => {
    const first = entry.points[0]?.c;
    const last = entry.points.at(-1)?.c;
    return { symbol: entry.symbol, change: first && last ? ((last / first - 1) * 100) : null };
  });
  const removeSymbol = (symbol: string) => {
    const next = input.split(",").map((value) => value.trim().toUpperCase()).filter((value) => value && value !== symbol).join(", ");
    setInput(next); setSymbols(next.replace(/\s+/g, ""));
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="compare-workspace mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="compare-hero"><div><p className="eyebrow">Relative return explorer</p><h1>Compare performance</h1><p>Rebased to 0% at the start of the trailing year.</p></div><span className="compare-window">1Y window</span></div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSymbols(
              input
                .split(",")
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean)
                .join(","),
            );
          }}
          className="compare-form mt-6 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="tabular h-12 flex-1 rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none focus:border-primary/60"
            placeholder="Comma separated tickers"
          />
          <button className="h-12 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground">
            Compare
          </button>
        </form>

        {symbols.split(",").filter(Boolean).length > 0 && <div className="compare-chips">{symbols.split(",").filter(Boolean).map((symbol) => <button key={symbol} onClick={() => removeSymbol(symbol)}><span className="compare-chip-dot" style={{ background: COLORS[Math.max(0, symbols.split(",").indexOf(symbol)) % COLORS.length] }}/>{symbol}<X size={13}/></button>)}</div>}
        {snapshots.length > 0 && <div className="compare-snapshot-grid">{snapshots.map((item, index) => <article key={item.symbol} className="compare-snapshot"><span className="compare-chip-dot" style={{ background: COLORS[index % COLORS.length] }}/><div><p>{item.symbol}</p><b className={(item.change ?? 0) >= 0 ? "text-positive" : "text-negative"}>{item.change === null ? "—" : `${item.change >= 0 ? "+" : ""}${item.change.toFixed(2)}%`}</b></div><small>relative return</small></article>)}</div>}
        <div className="compare-chart-panel mt-6 rounded-2xl border border-border bg-card p-4" style={{ height: 440 }}>
          {rows.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 6" vertical={false} />
                <XAxis
                  dataKey="t"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={48}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v: string) =>
                    new Date(v.replace(" ", "T")).toLocaleDateString(undefined, { month: "short", year: "2-digit" })
                  }
                />
                <YAxis
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {series.map((s, i) => (
                  <Line
                    key={s.symbol}
                    type="monotone"
                    dataKey={s.symbol}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                    isAnimationActive
                    animationDuration={480}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            isFetching ? <DataLoading label="Building comparison view" detail="Rebasing the latest price histories." /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data for these tickers.</div>
          )}
        </div>
      </main>
    </div>
  );
}
