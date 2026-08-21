import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DeltaBadge } from "@/components/finance/DeltaBadge";
import { getQuotes } from "@/lib/finance.functions";
import { fmtCompact, fmtPrice } from "@/lib/format";
import type { GenericTable, Quote, ScreenerRow } from "@/lib/finance-types";
import type { StatementTable } from "@/lib/finance-normalize";
import { DataLoading } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { stockMovementClass } from "@/lib/stock-movement";
import "@/stock-movement.css";

export function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="intel-panel premium-panel overflow-hidden rounded-2xl border border-border/70 bg-card/55">
      <header className="intel-panel-header border-b border-border/60 px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function DataTable({
  table,
  empty = "No data available.",
  quotes,
}: {
  table?: GenericTable | undefined;
  empty?: string;
  quotes?: Quote[] | undefined;
}) {
  if (!table || table.rows.length === 0) return <EmptyState compact title={empty} />;
  const lead = table.columns[0] ?? "label";
  const details = table.columns.slice(1);
  const symbolColumn = table.columns.find((column) => /^(symbol|ticker|code)$/i.test(column));
  const quoteBySymbol = new Map((quotes ?? []).map((quote) => [quote.symbol, quote]));
  return <div className="generic-data-grid">{table.rows.map((row, index) => { const symbol = symbolColumn ? row[symbolColumn] : undefined; const quote = symbol ? quoteBySymbol.get(symbol) : undefined; return <article className={cn("generic-data-card", quote ? stockMovementClass(quote.changePercent) : "")} key={`${row[lead] ?? "row"}-${index}`}><span className="generic-data-index">{String(index + 1).padStart(2, "0")}</span>{symbol ? <Link to="/stock/$symbol" params={{ symbol }} className="block rounded focus:outline-none focus:ring-2 focus:ring-primary"><b>{row[lead] ?? symbol}</b></Link> : <b>{row[lead] ?? "—"}</b>}<div>{details.map(column => <span key={column}><small>{column}</small><strong>{row[column] ?? "—"}</strong></span>)}</div></article>; })}</div>;
}

export function StatementView({
  table,
  empty,
}: {
  table?: StatementTable | undefined;
  empty?: string;
}) {
  if (!table || table.rows.length === 0) return <EmptyState compact title={empty ?? "No data available."} />;
  return <div className="statement-card-grid">{table.rows.map((row) => <article className="statement-card" key={row.label}><b>{row.label}</b><div>{table.columns.map((column, index) => <span key={column}><small>{column}</small><strong>{row.values[index] === null ? "—" : fmtCompact(row.values[index] ?? null)}</strong></span>)}</div></article>)}</div>;
}

export function ScreenerTable({
  rows,
  loading,
}: {
  rows?: ScreenerRow[] | undefined;
  loading?: boolean | undefined;
}) {
  const sourceRows = rows ?? [];
  const quotesFn = useServerFn(getQuotes);
  const symbolsNeedingLiveQuotes = sourceRows
    .filter((row) => row.price === null || row.changePercent === null || row.marketCap === null)
    .map((row) => row.symbol);
  const { data: liveQuotes } = useQuery({
    queryKey: ["screener-card-live-quotes", symbolsNeedingLiveQuotes.join(",")],
    queryFn: () => quotesFn({ data: { symbols: symbolsNeedingLiveQuotes.join(",") } }),
    enabled: symbolsNeedingLiveQuotes.length > 0,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const quoteBySymbol = new Map((liveQuotes ?? []).map((quote) => [quote.symbol, quote]));
  const resolvedRows = sourceRows.map((row) => {
    const quote = quoteBySymbol.get(row.symbol);
    return quote ? { ...row, price: row.price ?? quote.price, changePercent: row.changePercent ?? quote.changePercent, marketCap: row.marketCap ?? quote.marketCap, exchange: row.exchange ?? quote.exchange, currency: row.currency ?? quote.currency } : row;
  });
  if (loading) return <DataLoading compact label="Screening live markets" detail="Filtering the latest prices, volume, and fundamentals." />;
  if (sourceRows.length === 0) return <EmptyState compact title="No matches right now." detail="Change the filters or try a different live screener." />;
  return <div className="screener-card-grid">{resolvedRows.map((r) => <Link key={r.symbol} to="/stock/$symbol" params={{ symbol: r.symbol }} className={cn("screener-card", stockMovementClass(r.changePercent))}><div className="screener-card-top"><span>{r.exchange ?? "Market"}</span><DeltaBadge value={r.changePercent} size="sm"/></div><div className="screener-card-name"><b>{r.symbol}</b><small>{r.name}</small></div><strong className="screener-card-price">{fmtPrice(r.price, r.currency)}</strong><div className="screener-card-metrics"><span><small>Market cap</small><b>{r.marketCap === null ? "—" : fmtCompact(r.marketCap, r.currency)}</b></span><span><small>P/E</small><b>{r.peRatio === null ? "—" : r.peRatio.toFixed(1)}</b></span><span><small>Rating</small><b>{r.rating ?? "—"}</b></span></div></Link>)}</div>;
}
