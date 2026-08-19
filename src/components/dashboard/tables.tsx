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
  return (
    <table className="w-full min-w-max text-sm">
      <thead className="bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
        <tr>
          {table.columns.map((c) => (
            <th key={c} className="whitespace-nowrap px-4 py-2.5 text-left font-medium">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {table.rows.map((row, i) => (
          <tr key={i} className="hover:bg-accent/30">
            {table.columns.map((c) => (
              <td key={c} className="tabular whitespace-nowrap px-4 py-2.5 text-foreground/90">
                {row[c]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StatementView({
  table,
  empty,
}: {
  table?: StatementTable | undefined;
  empty?: string;
}) {
  if (!table || table.rows.length === 0) return <EmptyState compact title={empty ?? "No data available."} />;
  return (
    <table className="w-full min-w-max text-sm">
      <thead className="bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
        <tr>
          <th className="px-4 py-2.5 text-left font-medium">Metric</th>
          {table.columns.map((c) => (
            <th key={c} className="px-4 py-2.5 text-right font-medium">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {table.rows.map((r) => (
          <tr key={r.label} className="hover:bg-accent/30">
            <td className="whitespace-nowrap px-4 py-2.5 text-foreground/90">{r.label}</td>
            {r.values.map((v, i) => (
              <td
                key={i}
                className="tabular whitespace-nowrap px-4 py-2.5 text-right text-foreground"
              >
                {v === null ? "—" : fmtCompact(v)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
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
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
        <tr>
          <th className="px-4 py-2.5 text-left font-medium">Symbol</th>
          <th className="px-4 py-2.5 text-left font-medium">Name</th>
          <th className="px-4 py-2.5 text-right font-medium">Price</th>
          <th className="px-4 py-2.5 text-right font-medium">Change</th>
          <th className="px-4 py-2.5 text-right font-medium">Mkt cap</th>
          <th className="px-4 py-2.5 text-right font-medium">P/E</th>
          <th className="px-4 py-2.5 text-left font-medium">Rating</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {rows.map((r) => (
          <tr key={r.symbol} className="hover:bg-accent/30">
            <td className="px-4 py-2.5">
              <Link
                to="/stock/$symbol"
                params={{ symbol: r.symbol }}
                className="font-medium text-foreground hover:text-primary"
              >
                {r.symbol}
              </Link>
            </td>
            <td className="max-w-[260px] truncate px-4 py-2.5 text-muted-foreground">{r.name}</td>
            <td className="tabular px-4 py-2.5 text-right text-foreground">{fmtPrice(r.price)}</td>
            <td className="px-4 py-2.5 text-right">
              <DeltaBadge value={r.changePercent} size="sm" />
            </td>
            <td className="tabular px-4 py-2.5 text-right text-foreground/80">
              {r.marketCap === null ? "—" : fmtCompact(r.marketCap)}
            </td>
            <td className="tabular px-4 py-2.5 text-right text-foreground/80">
              {r.peRatio === null ? "—" : r.peRatio.toFixed(1)}
            </td>
            <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.rating ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
