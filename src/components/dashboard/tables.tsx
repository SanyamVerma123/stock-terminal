import { Link } from "@tanstack/react-router";
import { DeltaBadge } from "@/components/finance/DeltaBadge";
import { fmtCompact, fmtPrice } from "@/lib/format";
import type { GenericTable, ScreenerRow } from "@/lib/finance-types";
import type { StatementTable } from "@/lib/finance-normalize";
import { DataLoading } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

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
    <section className="premium-panel overflow-hidden rounded-2xl border border-border/70 bg-card/55">
      <header className="border-b border-border/60 px-5 py-3">
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
}: {
  table?: GenericTable | undefined;
  empty?: string;
}) {
  if (!table || table.rows.length === 0) return <EmptyState compact title={empty} />;
  const lead = table.columns[0] ?? "label";
  const details = table.columns.slice(1);
  return <div className="generic-data-grid">{table.rows.map((row, index) => <article className="generic-data-card" key={`${row[lead] ?? "row"}-${index}`}><span className="generic-data-index">{String(index + 1).padStart(2, "0")}</span><b>{row[lead] ?? "—"}</b><div>{details.map(column => <span key={column}><small>{column}</small><strong>{row[column] ?? "—"}</strong></span>)}</div></article>)}</div>;
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
  if (loading) return <DataLoading compact label="Screening live markets" detail="Filtering the latest prices, volume, and fundamentals." />;
  if (!rows || rows.length === 0) return <EmptyState compact title="No matches right now." detail="Change the filters or try a different live screener." />;
  return <div className="screener-card-grid">{rows.map((r) => <Link key={r.symbol} to="/stock/$symbol" params={{ symbol: r.symbol }} className="screener-card"><div className="screener-card-top"><span>{r.exchange ?? "Market"}</span><DeltaBadge value={r.changePercent} size="sm"/></div><div className="screener-card-name"><b>{r.symbol}</b><small>{r.name}</small></div><strong className="screener-card-price">{fmtPrice(r.price)}</strong><div className="screener-card-metrics"><span><small>Market cap</small><b>{r.marketCap === null ? "—" : fmtCompact(r.marketCap)}</b></span><span><small>P/E</small><b>{r.peRatio === null ? "—" : r.peRatio.toFixed(1)}</b></span><span><small>Rating</small><b>{r.rating ?? "—"}</b></span></div></Link>)}</div>;
}
