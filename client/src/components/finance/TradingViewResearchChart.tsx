import { useEffect, useRef } from "react";

function tradingViewSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (normalized.endsWith(".NS")) return `NSE:${normalized.replace(/\.NS$/, "")}`;
  if (normalized.endsWith(".BO")) return `BSE:${normalized.replace(/\.BO$/, "")}`;
  if (normalized.includes("-USD")) return `COINBASE:${normalized.replace("-", "")}`;
  return `NASDAQ:${normalized}`;
}

/** Optional full-screen chart embed for users who prefer TradingView research controls. */
export function TradingViewResearchChart({ symbol, theme = "dark", height = 420 }: { symbol: string; theme?: "dark" | "light"; height?: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({ autosize: true, symbol: tradingViewSymbol(symbol), interval: "D", timezone: "Etc/UTC", theme, style: "1", locale: "en", allow_symbol_change: true, calendar: false, support_host: "https://www.tradingview.com" });
    host.appendChild(script);
    return () => host.replaceChildren();
  }, [symbol, theme]);
  return <div className="tradingview-widget-container panel" style={{ height }}><div ref={hostRef} className="tradingview-widget-container__widget" style={{ height: "100%" }}/></div>;
}
