import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { getQuotes } from "@/lib/finance.functions";
import { UNIVERSE } from "@/lib/universe";
import { DeltaBadge } from "@/components/finance/DeltaBadge";
import { fmtCompact, fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/finance-types";
import { DataLoading } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

export const MOBILE_QUOTE_RAIL_COLUMNS = ["Price", "Change", "Day range", "52W high", "Mkt cap"] as const;

export function useQuotes(symbols: string[]) {
  const fn = useServerFn(getQuotes);
  const key = symbols.join(",");
  return useQuery({
    queryKey: ["quotes", key],
    queryFn: () => fn({ data: { symbols: key } }),
    enabled: symbols.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function QuoteTable({
  symbols,
  filter,
  watchlist,
  onToggleWatch,
  emptyLabel = "Nothing here yet.",
  showMobileDetailRail = true,
}: {
  symbols: string[];
  filter?: (q: Quote) => boolean;
  watchlist: string[];
  onToggleWatch: (symbol: string) => void;
  emptyLabel?: string;
  showMobileDetailRail?: boolean;
}) {
  const { data, isLoading } = useQuotes(symbols);
  const rows = (data ?? []).filter((q) => (filter ? filter(q) : true));

  if (!symbols.length) return <p className="p-8 text-sm text-muted-foreground">{emptyLabel}</p>;

  return (
    <div className="rounded-2xl border border-border bg-card p-2.5 sm:p-3">
      {isLoading && <DataLoading compact label="Screening live markets" detail="Filtering the latest prices, ranges, and market capitalizations." />}
      {!isLoading && rows.length === 0 && <EmptyState compact title={emptyLabel} detail="Market data will appear here when it is available." />}
      {!isLoading && rows.length > 0 && <div className="screener-card-grid">{rows.map((q) => {
        const meta = UNIVERSE[q.symbol];
        const starred = watchlist.includes(q.symbol);
        return <article key={q.symbol} className="screener-card"><div className="screener-card-top"><span>{q.exchange ?? "Live quote"}</span><div className="flex items-center gap-1.5"><DeltaBadge value={q.changePercent} size="sm" /><button type="button" onClick={() => onToggleWatch(q.symbol)} className={cn("relative z-10 p-0.5", starred ? "text-amber-400" : "text-muted-foreground hover:text-amber-400")} title={starred ? "Remove from watchlist" : "Add to watchlist"}><Star className="h-3.5 w-3.5" fill={starred ? "currentColor" : "none"} /></button></div></div><Link to="/stock/$symbol" params={{ symbol: q.symbol }} className="block"><div className="screener-card-name"><b>{q.symbol}</b><small>{meta?.name ?? q.name}</small></div><strong className="screener-card-price">{fmtPrice(q.price, q.currency)}</strong><div className="screener-card-metrics"><span><small>Market cap</small><b>{fmtCompact(q.marketCap, q.currency)}</b></span><span><small>Day range</small><b>{fmtPrice(q.dayLow, q.currency)}–{fmtPrice(q.dayHigh, q.currency)}</b></span><span><small>52W high</small><b>{fmtPrice(q.yearHigh, q.currency)}</b></span></div></Link></article>;
      })}</div>}
      {showMobileDetailRail && !isLoading && rows.length > 0 && <div className="border-t border-border/60 px-2 pb-2 pt-2 md:hidden"><p className="mb-1.5 px-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">More metrics · swipe left</p><div className="no-scrollbar overflow-x-auto rounded-lg border border-border/60"><div className="min-w-[680px] divide-y divide-border/60 text-[10px]"><div className="grid grid-cols-[1.1fr_.85fr_.95fr_1.35fr_.9fr_.9fr] gap-2 bg-muted/30 px-2 py-2 font-medium uppercase tracking-[0.08em] text-[8px] text-muted-foreground"><span>Symbol</span><span>Price</span><span>Change</span><span>Day range</span><span>52W high</span><span>Cap</span></div>{rows.map((q) => <div key={`rail-${q.symbol}`} className="grid grid-cols-[1.1fr_.85fr_.95fr_1.35fr_.9fr_.9fr] gap-2 px-2 py-2 tabular text-muted-foreground"><Link to="/stock/$symbol" params={{ symbol: q.symbol }} className="truncate font-semibold text-foreground">{q.symbol}</Link><span className="truncate">{fmtPrice(q.price, q.currency)}</span><span className={cn("truncate", (q.changePercent ?? 0) >= 0 ? "text-positive" : "text-negative")}>{q.changePercent === null ? "—" : `${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`}</span><span className="truncate">{fmtPrice(q.dayLow, q.currency)} – {fmtPrice(q.dayHigh, q.currency)}</span><span className="truncate">{fmtPrice(q.yearHigh, q.currency)}</span><span className="truncate">{fmtCompact(q.marketCap, q.currency)}</span></div>)}</div></div></div>}
    </div>
  );
}
