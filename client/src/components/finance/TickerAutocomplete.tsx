import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import type { SearchResult } from "@/lib/finance-types";

export function TickerAutocomplete({ compact = false, placeholder = "Search stocks, ETFs, indices…", onSelect }: { compact?: boolean; placeholder?: string; onSelect?: (item: SearchResult) => void }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isFetching } = trpc.finance.search.useQuery({ query }, { enabled: query.trim().length >= 1, staleTime: 60_000 });
  useEffect(() => { if (!query.trim()) setOpen(false); }, [query]);
  const choose = (item: SearchResult) => { setQuery(""); setOpen(false); if (onSelect) onSelect(item); else setLocation(`/stock/${item.symbol}`); };
  return <div className={`ticker-search ${compact ? "ticker-search-compact" : ""}`}><Search size={17} /><input value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => query && setOpen(true)} onKeyDown={event => { if (event.key === "Enter" && query.trim() && !onSelect) setLocation(`/stock/${query.trim().toUpperCase()}`); }} placeholder={placeholder} aria-label="Search financial instruments" />{open && query && <div className="ticker-results">{isFetching && <div className="ticker-row muted">Searching markets…</div>}{(data as SearchResult[] | undefined)?.map(item => <button key={`${item.symbol}-${item.exchange}`} className="ticker-row" onMouseDown={() => choose(item)}><span className="ticker-symbol">{item.symbol}</span><span className="ticker-name">{item.name}</span><span className="ticker-exchange">{item.exchange}</span></button>)}{!isFetching && data?.length === 0 && <div className="ticker-row muted">No matching instruments found.</div>}</div>}</div>;
}
