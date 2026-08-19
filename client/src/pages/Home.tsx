import { ArrowUpRight } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { IndustryHeatmap } from "@/components/dashboard/industry-heatmap/IndustryHeatmap";
import { QuoteTable } from "@/components/dashboard/QuoteTable";
import { DeltaBadge } from "@/components/finance/DeltaBadge";
import type { FinanceQuote } from "@/lib/finance-types";
import { fmtPrice } from "@/lib/format";
import { MARKET_WATCHLIST } from "@/lib/markets";
import { trpc } from "@/lib/trpc";
export default function Home() { const [, setLocation] = useLocation(); const { data: marketStrip = [] } = trpc.finance.marketStrip.useQuery(undefined, { staleTime: 15_000, refetchInterval: 30_000 }); const { data: quotes = [] } = trpc.finance.quotes.useQuery({ symbols: MARKET_WATCHLIST }, { staleTime: 15_000, refetchInterval: 30_000 }); const list = quotes as FinanceQuote[]; return <DashboardShell><h1 className="terminal-page-title">Markets</h1><section className="terminal-intro"><div><p>Market intelligence</p><h2>Momentum, breadth, and activity</h2><span>Live market context for tracked equities, refreshed quietly in the background.</span></div><b><i/> Live context</b></section><section className="terminal-market-strip">{(marketStrip as FinanceQuote[]).map(quote => <a key={quote.symbol} href={`/stock/${quote.symbol}`}><span>{quote.name}</span><strong>{fmtPrice(quote.price, quote.currency)}</strong><DeltaBadge value={quote.changePercent}/></a>)}</section><section className="terminal-section"><div className="terminal-section-heading"><h2>Most active</h2><button onClick={() => setLocation("/compare")}>View comparison <ArrowUpRight size={14}/></button></div><QuoteTable quotes={list} title=""/></section><section className="terminal-section"><div className="terminal-section-heading"><h2>Sector & industry detail</h2></div><IndustryHeatmap quotes={list}/></section></DashboardShell>; }
