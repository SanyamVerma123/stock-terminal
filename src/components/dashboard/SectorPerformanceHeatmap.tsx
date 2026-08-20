import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getQuotes, getSectorOverview } from "@/lib/finance.functions";
import { useMarketConfig } from "@/lib/app-state";
import { INDIA_SECTOR_NIFTY_BENCHMARKS, SECTOR_KEYS, sectorLabel } from "@/lib/markets";
import { fmtCompact } from "@/lib/format";

function movementClass(value: number | null) {
  if (value === null) return "border-border bg-muted/30 text-muted-foreground";
  if (value >= 1) return "border-positive/35 bg-positive/20 text-positive";
  if (value > 0) return "border-positive/25 bg-positive/10 text-positive";
  if (value <= -1) return "border-negative/35 bg-negative/20 text-negative";
  return "border-negative/25 bg-negative/10 text-negative";
}

export function SectorPerformanceHeatmap() {
  const cfg = useMarketConfig();
  const overviewFn = useServerFn(getSectorOverview);
  const quotesFn = useServerFn(getQuotes);
  const overviews = useQueries({
    queries: SECTOR_KEYS.map((sectorKey) => ({
      queryKey: ["sector-map", cfg.id, sectorKey],
      queryFn: () => overviewFn({ data: { sectorKey, region: cfg.id } }),
      staleTime: 300_000,
      refetchOnWindowFocus: false,
    })),
  });
  const resolved = overviews.map((query, index) => ({ sectorKey: SECTOR_KEYS[index]!, value: query.data }));
  const signals = resolved.map(({ sectorKey, value }) => {
    const column = value?.topCompanies.columns.find((item) => /symbol|ticker|code/i.test(item));
    const leadSymbol = column ? value?.topCompanies.rows[0]?.[column] : undefined;
    const benchmark = cfg.id === "IN" ? INDIA_SECTOR_NIFTY_BENCHMARKS[sectorKey] : undefined;
    return { sectorKey, symbol: benchmark?.symbol ?? leadSymbol, label: benchmark?.label, benchmark: Boolean(benchmark) };
  });
  const symbols = signals.map((signal) => signal.symbol).filter((symbol): symbol is string => Boolean(symbol));
  const { data: quotes } = useQuery({
    queryKey: ["sector-map-moves", symbols.join(",")],
    queryFn: () => quotesFn({ data: { symbols: symbols.join(",") } }),
    enabled: symbols.length > 0,
    staleTime: 30_000,
  });
  const quoteBySymbol = new Map((quotes ?? []).map((quote) => [quote.symbol, quote]));
  const maxCap = Math.max(...resolved.map(({ value }) => value?.marketCap ?? 0), 1);
  const ready = resolved.filter(({ value }) => value).length;
  return <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Sector performance map</p><h2 className="mt-1 text-base font-semibold text-foreground">Market capitalization and daily direction</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">Tile area reflects available sector capitalization. {cfg.id === "IN" ? "Directly mapped sectors use their validated Nifty benchmark; unmapped sectors retain the leading provider-ranked company as a directional proxy." : "Color uses the 1D move of each sector’s leading provider-ranked company as a live directional proxy."}</p></div><span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{ready}/{SECTOR_KEYS.length} sectors</span></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{resolved.map(({ sectorKey, value }) => { const signal = signals.find((item) => item.sectorKey === sectorKey); const move = signal?.symbol ? quoteBySymbol.get(signal.symbol)?.changePercent ?? null : null; const span = value?.marketCap ? Math.max(1, Math.ceil((value.marketCap / maxCap) * 3)) : 1; return <article key={sectorKey} style={{ gridColumn: `span ${Math.min(span, 3)}` }} className={`min-h-24 rounded-xl border p-3 transition-transform hover:-translate-y-0.5 ${movementClass(move)}`}><p className="truncate text-xs font-semibold">{sectorLabel(sectorKey)}</p><p className="mt-3 text-lg font-semibold tabular">{move === null ? "—" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`}</p><p className="mt-1 truncate text-[10px] opacity-75">{signal?.label ?? (signal?.symbol ? "Lead-company proxy" : "Provider data loading")}</p><p className="mt-0.5 text-[10px] opacity-75">{value?.marketCap ? fmtCompact(value.marketCap) : "Provider data loading"}</p></article>; })}</div></section>;
}
