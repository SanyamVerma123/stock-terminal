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
}: {
  symbols: string[];
  filter?: (q: Quote) => boolean;
  watchlist: string[];
  onToggleWatch: (symbol: string) => void;
  emptyLabel?: string;
}) {
  const { data, isLoading } = useQuotes(symbols);
  const rows = (data ?? []).filter((q) => (filter ? filter(q) : true));

  if (!symbols.length) return <p className="p-8 text-sm text-muted-foreground">{emptyLabel}</p>;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-2 gap-2 p-2 md:hidden">
        {isLoading && <div className="col-span-2"><DataLoading compact label="Building live quote cards" detail="Prices and changes are arriving now." /></div>}
        {rows.map((q) => {
          const meta = UNIVERSE[q.symbol];
          const starred = watchlist.includes(q.symbol);
          return <article key={q.symbol} className="min-w-0 rounded-xl border border-border/70 bg-card/70 p-2.5"><div className="flex items-start justify-between gap-2"><Link to="/stock/$symbol" params={{ symbol: q.symbol }} className="min-w-0"><p className="truncate text-xs font-semibold text-foreground">{q.symbol}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{meta?.name ?? q.name}</p></Link><button type="button" onClick={() => onToggleWatch(q.symbol)} className={cn("shrink-0 p-0.5", starred ? "text-amber-400" : "text-muted-foreground")} title={starred ? "Remove from watchlist" : "Add to watchlist"}><Star className="h-3.5 w-3.5" fill={starred ? "currentColor" : "none"} /></button></div><p className="mt-3 truncate tabular text-sm font-semibold text-foreground">{fmtPrice(q.price, q.currency)}</p><div className="mt-1"><DeltaBadge value={q.changePercent} absolute={q.change} currency={q.currency} size="sm" /></div><div className="no-scrollbar mt-2 flex gap-1 overflow-x-auto border-t border-border/60 pt-1.5 text-[9px] text-muted-foreground"><span className="shrink-0">Cap {fmtCompact(q.marketCap, q.currency)}</span><span className="shrink-0">Range {fmtPrice(q.dayLow, q.currency)}–{fmtPrice(q.dayHigh, q.currency)}</span></div></article>;
        })}
        {!isLoading && rows.length === 0 && <div className="col-span-2"><EmptyState compact title={emptyLabel} detail="Market data will appear here when it is available." /></div>}
      </div>
      {!isLoading && rows.length > 0 && <div className="border-t border-border/60 px-2 pb-2 pt-2 md:hidden"><p className="mb-1.5 px-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">More metrics · swipe left</p><div className="no-scrollbar overflow-x-auto rounded-lg border border-border/60"><div className="min-w-[680px] divide-y divide-border/60 text-[10px]"><div className="grid grid-cols-[1.1fr_.85fr_.95fr_1.35fr_.9fr_.9fr] gap-2 bg-muted/30 px-2 py-2 font-medium uppercase tracking-[0.08em] text-[8px] text-muted-foreground"><span>Symbol</span><span>Price</span><span>Change</span><span>Day range</span><span>52W high</span><span>Cap</span></div>{rows.map((q) => <div key={`rail-${q.symbol}`} className="grid grid-cols-[1.1fr_.85fr_.95fr_1.35fr_.9fr_.9fr] gap-2 px-2 py-2 tabular text-muted-foreground"><Link to="/stock/$symbol" params={{ symbol: q.symbol }} className="truncate font-semibold text-foreground">{q.symbol}</Link><span className="truncate">{fmtPrice(q.price, q.currency)}</span><span className={cn("truncate", (q.changePercent ?? 0) >= 0 ? "text-positive" : "text-negative")}>{q.changePercent === null ? "—" : `${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`}</span><span className="truncate">{fmtPrice(q.dayLow, q.currency)} – {fmtPrice(q.dayHigh, q.currency)}</span><span className="truncate">{fmtPrice(q.yearHigh, q.currency)}</span><span className="truncate">{fmtCompact(q.marketCap, q.currency)}</span></div>)}</div></div></div>}
      <div className="hidden overflow-x-auto md:block">
      <table className="min-w-[760px] w-full text-sm">
        <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Symbol</th>
            <th className="px-4 py-2.5 text-right font-medium">Price</th>
            <th className="px-4 py-2.5 text-right font-medium">Change</th>
            <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">Day range</th>
            <th className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">52W high</th>
            <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Mkt cap</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <tr className="border-t border-border"><td colSpan={6}><DataLoading compact label="Building your live quote table" detail="Prices, ranges, and market caps are arriving now."/></td></tr>}
          {rows.map((q) => {
            const meta = UNIVERSE[q.symbol];
            const starred = watchlist.includes(q.symbol);
            return (
              <tr key={q.symbol} className="border-t border-border transition-colors hover:bg-accent/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleWatch(q.symbol)}
                      className={cn("p-1", starred ? "text-amber-400" : "text-muted-foreground hover:text-amber-400")}
                      title={starred ? "Remove from watchlist" : "Add to watchlist"}
                    >
                      <Star className="h-4 w-4" fill={starred ? "currentColor" : "none"} />
                    </button>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-[9px] font-bold text-muted-foreground">
                      {q.symbol.replace(/[-=.].*$/, "").slice(0, 4)}
                    </span>
                    <Link to="/stock/$symbol" params={{ symbol: q.symbol }} className="min-w-0">
                      <span className="block text-[13px] font-semibold text-foreground">{q.symbol}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {meta?.name ?? q.name}
                      </span>
                    </Link>
                  </div>
                </td>
                <td className="tabular px-4 py-3 text-right font-medium text-foreground">
                  {fmtPrice(q.price, q.currency)}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeltaBadge value={q.changePercent} absolute={q.change} currency={q.currency} size="sm" />
                </td>
                <td className="tabular hidden px-4 py-3 text-right text-muted-foreground md:table-cell">
                  {fmtPrice(q.dayLow, q.currency)} – {fmtPrice(q.dayHigh, q.currency)}
                </td>
                <td className="tabular hidden px-4 py-3 text-right text-muted-foreground lg:table-cell">
                  {fmtPrice(q.yearHigh, q.currency)}
                </td>
                <td className="tabular hidden px-4 py-3 text-right text-muted-foreground sm:table-cell">
                  {fmtCompact(q.marketCap, q.currency)}
                </td>
              </tr>
            );
          })}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={6}><EmptyState compact title={emptyLabel} detail="Market data will appear here when it is available." /></td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
