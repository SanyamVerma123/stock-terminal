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
  return <section className="heatmap-intelligence rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="market-kicker">Sector performance map</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Market direction by sector</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">Live direction, concentration, and leadership across the {cfg.label} market.</p></div><span className="heatmap-ready rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{ready}/{SECTOR_KEYS.length} live</span></div><div className="heatmap-canvas mt-4 grid aspect-square grid-cols-6 grid-rows-6 gap-1.5">{resolved.map(({ sectorKey, value }, index) => { const signal = signals.find((item) => item.sectorKey === sectorKey); const move = signal?.symbol ? quoteBySymbol.get(signal.symbol)?.changePercent ?? null : null; const size = index < 2 ? "col-span-3 row-span-2" : index < 5 ? "col-span-2 row-span-2" : "col-span-2"; const compact = index >= 5; const detail = signal?.label ?? (signal?.symbol ? "Lead-company proxy" : value?.marketCap ? fmtCompact(value.marketCap) : "Awaiting data"); return <article key={sectorKey} title={sectorLabel(sectorKey)} className={`heatmap-cell min-w-0 overflow-hidden rounded-lg border p-1.5 sm:p-2 ${size} ${movementClass(move)}`}><p className={`truncate font-semibold leading-tight ${compact ? "text-[7px] sm:text-[9px]" : "text-[9px] sm:text-[11px]"}`}>{sectorLabel(sectorKey)}</p><p className={`mt-1 truncate tabular font-semibold ${compact ? "text-[10px] sm:text-xs" : "text-sm sm:text-lg"}`}>{move === null ? "—" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`}</p>{!compact && <p className="mt-1 truncate text-[8px] opacity-75 sm:text-[10px]">{detail}</p>}</article>; })}</div></section>;
}
