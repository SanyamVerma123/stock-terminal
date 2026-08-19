import { ArrowRight, BarChart3, BrainCircuit, Search, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { AIView } from "@/components/dashboard/AIView";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { IndustryHeatmap } from "@/components/dashboard/industry-heatmap/IndustryHeatmap";
import { QuoteTable } from "@/components/dashboard/QuoteTable";
import { DeltaBadge } from "@/components/finance/DeltaBadge";
import { TickerAutocomplete } from "@/components/finance/TickerAutocomplete";
import type { FinanceQuote } from "@/lib/finance-types";
import { MARKET_WATCHLIST } from "@/lib/markets";
import { fmtPrice } from "@/lib/format";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: marketStrip = [] } = trpc.finance.marketStrip.useQuery(undefined, { staleTime: 15_000, refetchInterval: 30_000 });
  const { data: quotes = [] } = trpc.finance.quotes.useQuery({ symbols: MARKET_WATCHLIST }, { staleTime: 15_000, refetchInterval: 30_000 });
  const list = quotes as FinanceQuote[];
  const launchResearch = (prompt: string) => { sessionStorage.setItem("researchPrompt", prompt); setLocation("/chat"); };
  return <DashboardShell><section className="home-hero"><div className="hero-copy"><div className="status-line"><span className="pulse"/> Markets research workspace</div><h1>Understand market movement.<br/><em>Ask better questions.</em></h1><p>Research equities, compare performance, and investigate what matters with a purpose-built finance assistant.</p><div className="hero-search"><TickerAutocomplete placeholder="Search a ticker, company, ETF, or index"/></div><div className="hero-trust"><span><ShieldCheck size={15}/> Data-aware analysis</span><span><BrainCircuit size={15}/> Multi-turn research</span><span><BarChart3 size={15}/> Chart-first workflow</span></div></div><aside className="hero-brief"><div className="brief-top"><span>Market pulse</span><span className="live-dot">Live</span></div><h2>Every signal, in context.</h2><p>Track broad indices, inspect individual securities, and continue the analysis in one thread.</p><button onClick={() => launchResearch("What is moving the market today?")}>Start market research <ArrowRight size={16}/></button></aside></section><section className="market-strip">{(marketStrip as FinanceQuote[]).map(quote => <a key={quote.symbol} href={`/stock/${quote.symbol}`} className="market-tile"><span>{quote.name}</span><strong>{fmtPrice(quote.price, quote.currency)}</strong><DeltaBadge value={quote.changePercent}/></a>)}</section><section className="content-grid"><div className="grid-main"><QuoteTable quotes={list} title="Most followed"/><IndustryHeatmap quotes={list}/></div><div className="grid-side"><AIView onSelect={launchResearch}/><section className="panel research-note"><span className="eyebrow">Research primer</span><h2>From a ticker to a thesis</h2><p>Use the stock workspace to review price history, financial statements, analyst data, and relevant news before asking the assistant for a synthesized view.</p><button className="text-link" onClick={() => launchResearch("Show me a framework for researching a company before earnings")}>Open research guide <Search size={14}/></button></section></div></section></DashboardShell>;
}
