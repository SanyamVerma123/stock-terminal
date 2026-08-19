import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine } from "recharts";
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
const WINDOWS = [
  { id: "1mo", label: "1M", period: "1mo", interval: "1d" },
  { id: "3mo", label: "3M", period: "3mo", interval: "1d" },
  { id: "6mo", label: "6M", period: "6mo", interval: "1d" },
  { id: "1y", label: "1Y", period: "1y", interval: "1d" },
  { id: "5y", label: "5Y", period: "5y", interval: "1wk" },
] as const;

function ComparePage() {
  const [input, setInput] = useState("RELIANCE.NS, TCS.NS, INFY.NS");
  const [symbols, setSymbols] = useState("RELIANCE.NS,TCS.NS,INFY.NS");
  const [windowId, setWindowId] = useState<(typeof WINDOWS)[number]["id"]>("1y");
  const compare = useServerFn(getCompare);
  const activeWindow = WINDOWS.find((window) => window.id === windowId) ?? WINDOWS[3];

  const { data, isFetching } = useQuery({
    queryKey: ["compare", symbols, activeWindow.id],
    queryFn: () => compare({ data: { symbols, period: activeWindow.period, interval: activeWindow.interval } }),
    staleTime: 120_000,
    retry: false,
  });

  const series = data ?? [];
  const merged = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    const base = s.points[0]?.c;
    if (!base) continue;
    for (const p of s.points) {
      const row = merged.get(p.t) ?? { t: p.t };
      row[s.symbol] = Number(((p.c / base - 1) * 100).toFixed(2));
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
        <div className="compare-hero"><div><p className="eyebrow">Relative return explorer</p><h1>Compare performance</h1><p>Rebased to 0% at the start of the selected period, making relative movement comparable across prices.</p></div><span className="compare-window">{activeWindow.label} window</span></div>

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
        {snapshots.length > 0 && <div className="compare-snapshot-grid">{snapshots.map((item, index) => <article key={item.symbol} className="compare-snapshot"><span className="compare-chip-dot" style={{ background: COLORS[index % COLORS.length] }}/><div><p>{item.symbol}</p><b className={(item.change ?? 0) >= 0 ? "text-positive" : "text-negative"}>{item.change === null ? "—" : `${item.change >= 0 ? "+" : ""}${item.change.toFixed(2)}%`}</b></div><small>{activeWindow.label} relative return</small></article>)}</div>}
        <div className="compare-chart-panel mt-6 rounded-2xl border border-border bg-card p-4" style={{ height: 440 }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <div><p className="text-sm font-semibold text-foreground">Rebased relative return</p><p className="text-xs text-muted-foreground">Hover any point for the exact date and return by stock.</p></div>
            <div className="flex rounded-xl border border-border bg-muted/20 p-1" role="group" aria-label="Comparison time window">
              {WINDOWS.map((window) => <button key={window.id} type="button" onClick={() => setWindowId(window.id)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${window.id === activeWindow.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{window.label}</button>)}
            </div>
          </div>
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
                <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 5" strokeOpacity={0.6} />
                <Tooltip content={({ active, label, payload }) => active && payload?.length ? <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg"><p className="mb-1.5 font-medium text-foreground">{new Date(String(label).replace(" ", "T")).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p><div className="space-y-1">{payload.filter((entry) => typeof entry.value === "number").map((entry) => <div key={entry.name} className="flex items-center justify-between gap-5"><span style={{ color: entry.color }} className="font-medium">{entry.name}</span><b className={Number(entry.value) >= 0 ? "text-positive" : "text-negative"}>{Number(entry.value) >= 0 ? "+" : ""}{Number(entry.value).toFixed(2)}%</b></div>)}</div></div> : null} />
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
            isFetching ? <DataLoading label="Building comparison view" detail="Rebasing the latest price histories." /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-center"><p className="text-sm font-medium text-foreground">No comparison history is available right now.</p><p className="max-w-sm text-xs leading-5 text-muted-foreground">The market-data service did not return a complete price series for these tickers. Try a shorter window, another exchange-qualified symbol, or retry once the provider refreshes.</p></div>
          )}
        </div>
      </main>
    </div>
  );
}
