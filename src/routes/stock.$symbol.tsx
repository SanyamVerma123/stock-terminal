import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/finance/SiteHeader";
import { StockPriceChart } from "@/components/finance/StockPriceChart";
import { DeltaBadge } from "@/components/finance/DeltaBadge";
import {
  getAnalyst,
  getCalendar,
  getCorporateActions,
  getFinancials,
  getHistory,
  getIndustryOverview,
  getNews,
  getQuotes,
  getRankedNews,
  getSummary,
  getUpgrades,
} from "@/lib/finance.functions";
import { RANGES, type RangeKey, type StatementTable } from "@/lib/finance-types";
import { buildStatementHierarchy, type FinancialStatementKey } from "@/lib/statement-hierarchy";
import { fmtCompact, fmtDate, fmtNumber, fmtPercent, fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DataLoading } from "@/components/ui/loading-state";
import { TextShimmerLoader } from "@/components/ui/loader";
import { useAppState } from "@/lib/app-state";
import { Star } from "lucide-react";
import { NewsTimeline } from "@/components/research/NewsTimeline";
import { ResearchWithAIButton } from "@/components/research/ResearchWithAIButton";
import { FinancialVisualAnalytics } from "@/components/finance/FinancialVisualAnalytics";
import "@/stock-mobile.css";
import "@/fundamentals.css";
import "@/financial-visuals.css";

export const Route = createFileRoute("/stock/$symbol")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.symbol} Stock Price, Financials & AI Analysis — Screener` },
      {
        name: "description",
        content: `Live ${params.symbol} quote, interactive price chart, key ratios, income statement, analyst targets and latest news.`,
      },
      { property: "og:title", content: `${params.symbol} — Price, Financials & Analysis` },
      {
        property: "og:description",
        content: `Interactive chart, fundamentals and analyst coverage for ${params.symbol}.`,
      },
    ],
  }),
  component: StockPage,
});

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="research-sheet-card overflow-hidden rounded-2xl border border-border bg-card">
      <div className="research-sheet-card-header flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="research-metric rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="research-metric-label text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function FundamentalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="fundamental-metric">
      <span className="fundamental-metric-label">{label}</span>
      <strong className="fundamental-metric-value">{value}</strong>
    </div>
  );
}

type FinancialViewPreference = { statement: FinancialStatementKey; quarterly: boolean };

const FINANCIAL_VIEW_PREFERENCE_KEY = "sc:financial-view-preference";

function readFinancialViewPreference(): FinancialViewPreference {
  if (typeof window === "undefined") return { statement: "income", quarterly: false };
  try {
    const raw = window.localStorage.getItem(FINANCIAL_VIEW_PREFERENCE_KEY);
    if (!raw) return { statement: "income", quarterly: false };
    const value = JSON.parse(raw) as Partial<FinancialViewPreference>;
    return {
      statement: value.statement === "balance" || value.statement === "cash" ? value.statement : "income",
      quarterly: value.quarterly === true,
    };
  } catch {
    return { statement: "income", quarterly: false };
  }
}

function findStatementRow(statement: StatementTable | undefined, labels: string[]) {
  return statement?.rows.find((row) => labels.some((label) => row.label.toLowerCase() === label.toLowerCase()));
}

function calculateGrowth(row: StatementTable["rows"][number] | undefined) {
  const current = row?.values[0];
  const previous = row?.values[1];
  if (typeof current !== "number" || typeof previous !== "number" || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

function ProfitLossGrowthSummary({ statement, currency }: { statement: StatementTable | undefined; currency: string | null | undefined }) {
  const metrics = [
    { label: "Revenue growth", row: findStatementRow(statement, ["Total Revenue"]) },
    { label: "Operating income growth", row: findStatementRow(statement, ["Operating Income"]) },
    { label: "Net income growth", row: findStatementRow(statement, ["Net Income"]) },
  ];

  return (
    <section className="profit-loss-growth-summary" aria-label="Profit and Loss growth summary">
      <div className="profit-loss-growth-heading">
        <p className="fundamentals-kicker">Performance trend</p>
        <h3>Growth summary</h3>
      </div>
      <div className="profit-loss-growth-grid">
        {metrics.map(({ label, row }) => {
          const growth = calculateGrowth(row);
          return (
            <div key={label} className="profit-loss-growth-card">
              <span>{label}</span>
              <strong className={cn(growth !== null && growth < 0 && "is-negative")}>{growth === null ? "—" : fmtPercent(growth)}</strong>
              <small>{row?.values[0] === undefined ? "Awaiting statement data" : `${fmtCompact(row.values[0], currency)} latest period`}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FinancialStatementTable({
  title,
  description,
  statement,
  quarterly,
  currency,
  statementKey,
  expandedRows,
  onToggleRow,
}: {
  title: string;
  description: string;
  statement: StatementTable | undefined;
  quarterly: boolean;
  currency: string | null | undefined;
  statementKey: FinancialStatementKey;
  expandedRows: Record<string, boolean>;
  onToggleRow: (rowLabel: string) => void;
}) {
  const hierarchy = buildStatementHierarchy(statement, statementKey);
  return (
    <section className="financial-statement-section research-sheet-card overflow-hidden rounded-2xl border border-border bg-card" aria-label={`${title} financial statement`}>
      <div className="research-sheet-card-header flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="fundamentals-kicker">Financial statement</p>
          <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        </div>
        <span className="financial-statement-period">{quarterly ? "Quarterly" : "Annual"}</span>
      </div>
      <div className="p-4">
        <div className="fundamentals-statement-context">
          <span>{description}</span>
          <span>{currency === "INR" ? "Reported in Indian rupees" : "Provider-reported figures"}</span>
        </div>
        <div className="stock-data-scroll -mx-4 px-4" role="region" aria-label={`${title} data`} tabIndex={0}>
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="stock-data-row-label sticky left-0 z-20 bg-card py-2 pr-4 font-medium">Line item</th>
                {(statement?.columns ?? []).map((column) => (
                  <th key={column} className="tabular py-2 pl-4 text-right font-medium">{fmtDate(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hierarchy.map(({ label, summary, children }) => {
                const rowId = `${statementKey}:${label}`;
                const expanded = expandedRows[rowId] === true;
                return <Fragment key={label}>
                  <tr className={cn("border-b border-border/60 last:border-0", children.length > 0 && "financial-parent-row")}>
                    <td className="stock-data-row-label sticky left-0 z-10 bg-card py-2.5 pr-4 text-muted-foreground">
                      {children.length > 0 ? (
                        <button type="button" className="financial-line-expand" aria-expanded={expanded} onClick={() => onToggleRow(label)}>
                          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                          {label}
                        </button>
                      ) : <span className="financial-line-label">{label}</span>}
                    </td>
                    {(statement?.columns ?? []).map((_, index) => (
                      <td key={index} className="tabular py-2.5 pl-4 text-right text-foreground">{fmtCompact(summary?.values[index] ?? null, currency)}</td>
                    ))}
                  </tr>
                  {expanded && children.map((child) => (
                    <tr key={`${label}-${child.label}`} className="financial-child-row border-b border-border/50">
                      <td className="stock-data-row-label sticky left-0 z-10 bg-card py-2 pl-4 pr-4 text-muted-foreground"><span className="financial-child-label">{child.label}</span></td>
                      {child.values.map((value, index) => (
                        <td key={`${child.label}-${index}`} className="tabular py-2 pl-4 text-right text-foreground">{fmtCompact(value, currency)}</td>
                      ))}
                    </tr>
                  ))}
                </Fragment>;
              })}
            </tbody>
          </table>
          {!statement?.rows.length && <p className="py-6 text-sm text-muted-foreground">No provider statement data.</p>}
        </div>
        <p className="stock-data-scroll-hint" aria-hidden="true">Swipe sideways to view all periods</p>
      </div>
    </section>
  );
}

function StockPage() {
  const { symbol } = Route.useParams();
  const [range, setRange] = useState<RangeKey>("6mo");
  const [financialPreference, setFinancialPreference] = useState<FinancialViewPreference>(readFinancialViewPreference);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const { isWatched, toggleWatchlist } = useAppState();
  const statement = financialPreference.statement;
  const quarterly = financialPreference.quarterly;

  const updateFinancialPreference = (next: FinancialViewPreference) => {
    setFinancialPreference(next);
    try {
      window.localStorage.setItem(FINANCIAL_VIEW_PREFERENCE_KEY, JSON.stringify(next));
    } catch {
      /* Preferences remain available for the current session. */
    }
  };

  const summaryFn = useServerFn(getSummary);
  const historyFn = useServerFn(getHistory);
  const newsFn = useServerFn(getNews);
  const rankedNewsFn = useServerFn(getRankedNews);
  const finFn = useServerFn(getFinancials);
  const analystFn = useServerFn(getAnalyst);
  const upgradesFn = useServerFn(getUpgrades);
  const calFn = useServerFn(getCalendar);
  const caFn = useServerFn(getCorporateActions);
  const industryFn = useServerFn(getIndustryOverview);
  const quotesFn = useServerFn(getQuotes);

  const cfg = RANGES.find((r) => r.key === range)!;

  const {
    data: summary,
    isLoading: loadingSummary,
    error,
  } = useQuery({
    queryKey: ["summary", symbol],
    queryFn: () => summaryFn({ data: { symbol } }),
    staleTime: 30_000,
  });
  const { data: history, isFetching: loadingHistory } = useQuery({
    queryKey: ["history", symbol, range],
    queryFn: () => historyFn({ data: { symbol, period: cfg.period, interval: cfg.interval } }),
    staleTime: 30_000,
  });
  const { data: news } = useQuery({
    queryKey: ["news", symbol],
    queryFn: () => newsFn({ data: { symbol } }),
    staleTime: 120_000,
  });
  const { data: rankedNews } = useQuery({
    queryKey: ["ranked-news", symbol],
    queryFn: () => rankedNewsFn({ data: { symbol } }),
    staleTime: 120_000,
  });
  const { data: incomeFinancials } = useQuery({
    queryKey: ["financials", symbol, "income", quarterly],
    queryFn: () => finFn({ data: { symbol, statement: "income", quarterly } }),
    staleTime: 300_000,
  });
  const { data: balanceFinancials } = useQuery({
    queryKey: ["financials", symbol, "balance", "annual"],
    queryFn: () => finFn({ data: { symbol, statement: "balance", quarterly: false } }),
    staleTime: 300_000,
  });
  const { data: cashFinancials } = useQuery({
    queryKey: ["financials", symbol, "cash", "annual"],
    queryFn: () => finFn({ data: { symbol, statement: "cash", quarterly: false } }),
    staleTime: 300_000,
  });
  const { data: analyst } = useQuery({
    queryKey: ["analyst", symbol],
    queryFn: () => analystFn({ data: { symbol } }),
    staleTime: 300_000,
  });
  const { data: upgrades } = useQuery({
    queryKey: ["upgrades", symbol],
    queryFn: () => upgradesFn({ data: { symbol } }),
    staleTime: 300_000,
  });
  const { data: calendar } = useQuery({
    queryKey: ["calendar", symbol],
    queryFn: () => calFn({ data: { symbol } }),
    staleTime: 300_000,
  });
  const { data: actions } = useQuery({
    queryKey: ["actions", symbol],
    queryFn: () => caFn({ data: { symbol } }),
    staleTime: 300_000,
  });

  const q = summary?.quote;
  const r = summary?.ratios;
  const { data: industryPeers } = useQuery({
    queryKey: ["industry-peers", r?.industry, q?.currency],
    queryFn: () => industryFn({ data: { industryKey: r?.industry ?? "", region: q?.currency === "INR" ? "in" : "us" } }),
    enabled: Boolean(r?.industry),
    staleTime: 300_000,
  });
  const peerSymbolColumn = industryPeers?.columns.find((column) => /symbol|ticker|code/i.test(column)) ?? "Symbol";
  const peerSymbols = (industryPeers?.rows ?? []).map((row) => row[peerSymbolColumn]).filter((value): value is string => Boolean(value)).filter((value) => value !== symbol).slice(0, 10);
  const { data: peerQuotes } = useQuery({
    queryKey: ["industry-peer-quotes", peerSymbols.join(",")],
    queryFn: () => quotesFn({ data: { symbols: peerSymbols.join(",") } }),
    enabled: peerSymbols.length > 0,
    staleTime: 60_000,
  });
  const peerBenchmark = (peerQuotes ?? []).filter((quote) => quote.changePercent !== null).reduce((total, quote, _, all) => total + (quote.changePercent ?? 0) / Math.max(all.length, 1), 0);
  const activeStatement = statement === "income"
    ? { title: "Profit & Loss", description: "Revenue, expenses, operating performance, and net income", data: incomeFinancials, period: quarterly ? "Quarterly" : "Annual" }
    : statement === "balance"
      ? { title: "Balance Sheet", description: "Assets, liabilities, equity, and financial position", data: balanceFinancials, period: "Annual" }
      : { title: "Cash Flow", description: "Operating, investing, financing, and net cash movement", data: cashFinancials, period: "Annual" };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="tabular text-2xl font-semibold text-foreground">{symbol}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We couldn't load data for this ticker. Check the symbol (Indian listings need a .NS or
            .BO suffix).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stock-research-shell min-h-screen bg-background">
      <SiteHeader />

      <main className="stock-research-main mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="stock-research-hero flex flex-wrap items-end justify-between gap-6">
          <div className="stock-research-heading">
            <div className="flex items-center gap-2">
              <span className="tabular rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {q?.exchange ?? "—"}
              </span>
              <span className="tabular text-xs text-muted-foreground">{symbol}</span>
              <button className={cn("watch-stock-button", isWatched(symbol) && "is-watched")} onClick={() => toggleWatchlist(symbol, q?.name ?? symbol)} title={isWatched(symbol) ? "Remove from watchlist" : "Add to watchlist"}><Star size={14} fill={isWatched(symbol) ? "currentColor" : "none"}/>{isWatched(symbol) ? "Watching" : "Watch"}</button>
            </div>
            <h1 className="stock-research-title mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {loadingSummary ? <TextShimmerLoader text={`Loading ${symbol} overview`} /> : (q?.name ?? symbol)}
            </h1>
            <div className="stock-research-price mt-3 flex items-end gap-3">
              <span className="tabular text-4xl font-semibold text-foreground">
                {fmtPrice(q?.price, q?.currency)}
              </span>
              <DeltaBadge
                value={q?.changePercent}
                absolute={q?.change}
                currency={q?.currency}
                size="lg"
              />
            </div>
          </div>
          <div className="stock-research-metrics grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Open" value={fmtPrice(q?.open, q?.currency)} />
            <Stat label="Prev close" value={fmtPrice(q?.previousClose, q?.currency)} />
            <Stat label="Day range" value={`${fmtNumber(q?.dayLow)} – ${fmtNumber(q?.dayHigh)}`} />
            <Stat
              label="52w range"
              value={`${fmtNumber(q?.yearLow)} – ${fmtNumber(q?.yearHigh)}`}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <Card
              title="Price"
              action={
                <div className="price-range-tabs flex flex-wrap gap-1">
                  {RANGES.map((rg) => (
                    <button
                      key={rg.key}
                      type="button"
                      onClick={() => setRange(rg.key)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs transition-colors",
                        range === rg.key
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {rg.label}
                    </button>
                  ))}
                </div>
              }
            >
              {loadingHistory ? <DataLoading compact label={`Loading ${symbol} price history`} detail="Preparing the selected chart range." /> : <div className="chart-ready"><StockPriceChart symbol={symbol} points={history ?? []} currency={q?.currency} /></div>}
            </Card>

            <section className="financial-analysis" aria-labelledby="financial-analysis-title">
              <div className="financial-analysis-header">
                <div>
                  <p className="fundamentals-kicker">Complete financials</p>
                  <h2 id="financial-analysis-title" className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">Financial statements</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Select one statement at a time for a focused period-by-period review.</p>
                </div>
                {statement === "income" && (
                  <div className="financial-period-toggle" aria-label="Profit and Loss period">
                    <button type="button" onClick={() => updateFinancialPreference({ statement: "income", quarterly: false })} className={cn(!quarterly && "is-active")}>Yearly</button>
                    <button type="button" onClick={() => updateFinancialPreference({ statement: "income", quarterly: true })} className={cn(quarterly && "is-active")}>Quarterly</button>
                  </div>
                )}
              </div>
              <div className="financial-statement-tabs" role="tablist" aria-label="Financial statement selector">
                {(["income", "balance", "cash"] as const).map((key) => {
                  const label = key === "income" ? "Profit & Loss" : key === "balance" ? "Balance Sheet" : "Cash Flow";
                  return <button key={key} type="button" role="tab" aria-selected={statement === key} className={cn(statement === key && "is-active")} onClick={() => updateFinancialPreference({ statement: key, quarterly })}>{label}</button>;
                })}
              </div>
              <div className="mt-4">
                <FinancialStatementTable title={activeStatement.title} description={activeStatement.description} statement={activeStatement.data} quarterly={activeStatement.period === "Quarterly"} currency={q?.currency} statementKey={statement} expandedRows={expandedRows} onToggleRow={(rowLabel) => setExpandedRows((previous) => ({ ...previous, [`${statement}:${rowLabel}`]: !previous[`${statement}:${rowLabel}`] }))} />
                {statement === "income" && <ProfitLossGrowthSummary statement={incomeFinancials} currency={q?.currency} />}
                <FinancialVisualAnalytics income={incomeFinancials} cash={cashFinancials} currency={q?.currency} />
                <p className="financial-preference-note" role="status">Your statement and Profit &amp; Loss period choice are saved on this device.</p>
              </div>
            </section>

            <Card title="Analyst coverage">
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Low" value={fmtPrice(analyst?.targets.low, q?.currency)} />
                <Stat label="Mean" value={fmtPrice(analyst?.targets.mean, q?.currency)} />
                <Stat label="Median" value={fmtPrice(analyst?.targets.median, q?.currency)} />
                <Stat label="High" value={fmtPrice(analyst?.targets.high, q?.currency)} />
              </div>
              <div className="mt-4 space-y-2">
                {(analyst?.distribution ?? []).map((d) => {
                  const total = d.strongBuy + d.buy + d.hold + d.sell + d.strongSell || 1;
                  const bars = [
                    { v: d.strongBuy + d.buy, c: "var(--positive)" },
                    { v: d.hold, c: "var(--muted-foreground)" },
                    { v: d.sell + d.strongSell, c: "var(--negative)" },
                  ];
                  return (
                    <div key={d.period} className="flex items-center gap-3">
                      <span className="tabular w-12 text-xs text-muted-foreground">{d.period}</span>
                      <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-surface">
                        {bars.map((b, i) => (
                          <span
                            key={i}
                            style={{ width: `${(b.v / total) * 100}%`, background: b.c }}
                          />
                        ))}
                      </span>
                      <span className="tabular w-8 text-right text-xs text-muted-foreground">
                        {total}
                      </span>
                    </div>
                  );
                })}
              </div>
              {!!upgrades?.length && (
                <div className="mt-5">
                  <div className="stock-data-scroll -mx-4 px-4" role="region" aria-label="Analyst rating changes" tabIndex={0}>
                  <table className="w-full min-w-[660px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="stock-data-row-label sticky left-0 z-20 bg-card py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 pr-4 font-medium">Firm</th>
                        <th className="py-2 pr-4 font-medium">From</th>
                        <th className="py-2 pr-4 font-medium">To</th>
                        <th className="py-2 pr-4 font-medium">Action</th>
                        <th className="tabular py-2 text-right font-medium">Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upgrades.slice(0, 8).map((u, i) => (
                        <tr key={i} className="border-b border-border/60 last:border-0">
                          <td className="stock-data-row-label sticky left-0 z-10 bg-card py-2 pr-4 text-foreground">{fmtDate(u.date)}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{u.firm || "—"}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{u.fromGrade || "—"}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{u.toGrade || "—"}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{u.action || "—"}</td>
                          <td className="tabular py-2 text-right text-foreground">{fmtPrice(u.priceTarget, q?.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <p className="stock-data-scroll-hint" aria-hidden="true">Swipe sideways to view every analyst field</p>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <section className="fundamentals-card research-sheet-card overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="fundamentals-title">
              <div className="research-sheet-card-header flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="fundamentals-kicker">Fundamental snapshot</p>
                  <h2 id="fundamentals-title" className="mt-0.5 text-sm font-medium text-foreground">Key ratios</h2>
                </div>
                <span className="fundamentals-status">Live data</span>
              </div>
              <div className="fundamentals-grid">
                <FundamentalMetric label="Market cap" value={fmtCompact(q?.marketCap, q?.currency)} />
                <FundamentalMetric label="Current price" value={fmtPrice(q?.price, q?.currency)} />
                <FundamentalMetric label="52W high / low" value={`${fmtPrice(q?.yearHigh, q?.currency)} / ${fmtPrice(q?.yearLow, q?.currency)}`} />
                <FundamentalMetric label="Stock P/E" value={fmtNumber(r?.trailingPE)} />
                <FundamentalMetric label="Forward P/E" value={fmtNumber(r?.forwardPE)} />
                <FundamentalMetric label="Price / book" value={fmtNumber(r?.priceToBook)} />
                <FundamentalMetric label="EV / EBITDA" value={fmtNumber(r?.enterpriseToEbitda)} />
                <FundamentalMetric label="Dividend yield" value={fmtPercent(r?.dividendYield)} />
                <FundamentalMetric label="Return on equity" value={fmtPercent(r?.returnOnEquity)} />
                <FundamentalMetric label="Profit margin" value={fmtPercent(r?.profitMargins)} />
                <FundamentalMetric label="Revenue growth" value={fmtPercent(r?.revenueGrowth)} />
                <FundamentalMetric label="Debt / equity" value={fmtNumber(r?.debtToEquity)} />
              </div>
              {(r?.sector || r?.industry || r?.summary) && (
                <div className="fundamentals-context">
                  {(r?.sector || r?.industry) && <p className="fundamentals-sector">{r?.sector} {r?.industry ? `· ${r.industry}` : ""}</p>}
                  {r?.summary && <p className="fundamentals-summary line-clamp-4">{r.summary}</p>}
                </div>
              )}
            </section>

            <Card title="Industry peers">
              <p className="text-xs text-muted-foreground">{r?.industry ?? "Industry classification loading"} · equal-weight 1D peer benchmark</p>
              <div className="mt-3 grid grid-cols-2 gap-2"><Stat label="Peer benchmark" value={peerQuotes?.length ? `${peerBenchmark >= 0 ? "+" : ""}${peerBenchmark.toFixed(2)}%` : "Loading"} /><Stat label="Peers quoted" value={String(peerQuotes?.length ?? 0)} /></div>
              <div className="mt-3 space-y-1.5">{(peerQuotes ?? []).slice(0, 8).map((peer) => <a key={peer.symbol} href={`/stock/${encodeURIComponent(peer.symbol)}`} className="flex items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-2 text-xs hover:border-primary/40"><span className="font-medium text-foreground">{peer.symbol}</span><span className={(peer.changePercent ?? 0) >= 0 ? "text-positive" : "text-negative"}>{peer.changePercent === null ? "—" : `${peer.changePercent >= 0 ? "+" : ""}${peer.changePercent.toFixed(2)}%`}</span></a>)}{peerSymbols.length === 0 ? <p className="text-xs text-muted-foreground">Provider peers will appear when industry coverage is available.</p> : null}</div>
            </Card>

            <Card title="Events">
              <div className="space-y-2">
                <Stat label="Next earnings" value={fmtDate(calendar?.earningsDate)} />
                <Stat label="Ex-dividend" value={fmtDate(calendar?.exDividendDate)} />
                <Stat label="EPS estimate" value={fmtNumber(calendar?.earningsAverage)} />
              </div>
              {!!actions?.dividends.length && (
                <div className="mt-4">
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Recent dividends
                  </p>
                  {actions.dividends
                    .slice(-5)
                    .reverse()
                    .map((d) => (
                      <div
                        key={d.date}
                        className="flex justify-between border-b border-border/60 py-1.5 text-sm last:border-0"
                      >
                        <span className="text-muted-foreground">{fmtDate(d.date)}</span>
                        <span className="tabular text-foreground">
                          {fmtPrice(d.amount, q?.currency)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </Card>

            <Card title="News"><NewsTimeline items={(rankedNews ?? news ?? []).map((item) => ({ ...item, symbol }))} empty="No recent headlines." /><div className="mt-4 border-t border-border pt-4"><ResearchWithAIButton prompt={`Research ${symbol} using the latest available news. Prioritize the highest-importance headlines, explain likely business relevance, identify industry-peer context for ${r?.industry ?? "its industry"}, and distinguish verified facts from uncertainty.`} /></div></Card>
          </div>
        </div>
      </main>
    </div>
  );
}
