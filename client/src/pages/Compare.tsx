import { Plus, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { SiteHeader } from "@/components/finance/SiteHeader";
import { DeltaBadge } from "@/components/finance/DeltaBadge";
import { TickerAutocomplete } from "@/components/finance/TickerAutocomplete";
import type { FinanceQuote, SearchResult } from "@/lib/finance-types";
import { fmtCompact, fmtNumber, fmtPrice } from "@/lib/format";
import { trpc } from "@/lib/trpc";
type MetricRow = { label: string; render: (quote: FinanceQuote) => ReactNode };
export default function Compare() {
  const [symbols, setSymbols] = useState(["AAPL", "MSFT"]);
  const { data = [] } = trpc.finance.quotes.useQuery({ symbols });
  const quotes = data as FinanceQuote[];
  const ordered = useMemo(() => symbols.map(symbol => quotes.find(quote => quote.symbol === symbol)).filter(Boolean) as FinanceQuote[], [quotes, symbols]);
  const remove = (symbol: string) => setSymbols(current => current.filter(item => item !== symbol));
  const add = (item: SearchResult) => setSymbols(current => current.includes(item.symbol) || current.length >= 4 ? current : [...current, item.symbol]);
  const metricRows: MetricRow[] = [{ label: "Price", render: quote => fmtPrice(quote.price, quote.currency) }, { label: "Daily change", render: quote => <DeltaBadge value={quote.changePercent} absolute={quote.change} currency={quote.currency}/> }, { label: "Market cap", render: quote => fmtCompact(quote.marketCap) }, { label: "Opening price", render: quote => fmtPrice(quote.open, quote.currency) }, { label: "Day range", render: quote => `${fmtNumber(quote.dayLow)} – ${fmtNumber(quote.dayHigh)}` }, { label: "52-week range", render: quote => `${fmtNumber(quote.yearLow)} – ${fmtNumber(quote.yearHigh)}` }, { label: "Volume", render: quote => fmtCompact(quote.volume) }];
  return <><SiteHeader/><main className="compare-page"><section className="compare-header"><span className="eyebrow">Side-by-side research</span><h1>Compare securities</h1><p>Place current market data and essential valuation metrics in the same frame.</p><div className="compare-controls"><TickerAutocomplete compact placeholder="Add a ticker" onSelect={add}/><span className="add-tip"><Plus size={15}/> Add up to four securities</span></div></section><section className="panel comparison-table"><div className="table-scroll"><table><thead><tr><th>Metric</th>{ordered.map(quote => <th key={quote.symbol}><span className="compare-symbol">{quote.symbol}{symbols.length > 1 && <button onClick={() => remove(quote.symbol)} aria-label={`Remove ${quote.symbol}`}><X size={13}/></button>}</span><small>{quote.name}</small></th>)}</tr></thead><tbody>{metricRows.map(row => <tr key={row.label}><td>{row.label}</td>{ordered.map(quote => <td key={quote.symbol}>{row.render(quote)}</td>)}</tr>)}</tbody></table></div>{!ordered.length && <div className="table-empty">Add one or more listed symbols to compare live financial data.</div>}</section><p className="disclaimer">Comparisons are for information and research only, not personalized financial advice.</p></main></>;
}
