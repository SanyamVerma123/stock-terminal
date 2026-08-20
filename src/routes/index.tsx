import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { DashboardShell, PAGE_TITLES, type PageId } from "@/components/dashboard/DashboardShell";
import { QuoteTable } from "@/components/dashboard/QuoteTable";
import { AIView } from "@/components/dashboard/AIView";
import { SectorPerformanceHeatmap } from "@/components/dashboard/SectorPerformanceHeatmap";
import {
  AlertsView,
  MarketStrip,
  NewsView,
  SettingsView,
  WatchlistView,
} from "@/components/dashboard/views";
import {
  CalendarsView,
  EstimatesView,
  EtfScreenerView,
  FilingsView,
  GlobalMarketsView,
  MoversView,
  NewsSearchView,
  OptionsView,
  OwnershipView,
  ProScreenerView,
  SavedScreenerView,
  SectorsView,
} from "@/components/dashboard/tool-views";
import { useAppState, useMarketConfig } from "@/lib/app-state";
import { useScreenerAlertRunner } from "@/hooks/use-screener-alert-runner";
import { CRYPTO_SYMS, FOREX_SYMS } from "@/lib/markets";
import { PRESETS, symbolsForMarketPreset } from "@/lib/universe";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    const view = typeof search["view"] === "string" ? search["view"] : undefined;
    return view ? { view } : {};
  },
  head: () => ({
    meta: [
      { title: "Screener Terminal — Live Markets, Screener & AI Analyst" },
      {
        name: "description",
        content:
          "A live market terminal: indices, screener presets, watchlist, alerts, news and an AI analyst that reads real fundamentals.",
      },
      { property: "og:title", content: "Screener Terminal — Live Markets & AI Analyst" },
      {
        property: "og:description",
        content:
          "Screener presets, watchlists, alerts, news and an AI analyst grounded in live market data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const search = Route.useSearch();
  const [page, setPage] = useState<PageId>(() => {
    if (typeof window === "undefined") return "markets";
    const requested = new URLSearchParams(window.location.search).get("view") as PageId | null;
    return requested ?? "markets";
  });
  const { market, watchSymbols, toggleWatchlist, alerts, screeners } = useAppState();
  const cfg = useMarketConfig();
  const qc = useQueryClient();
  useScreenerAlertRunner();

  useEffect(() => {
    if (search.view) setPage(search.view);
  }, [search.view]);

  const table = (
    symbols: string[],
    filter?: Parameters<typeof QuoteTable>[0]["filter"],
    empty?: string,
    showMobileDetailRail = true,
  ) => (
    <QuoteTable
      symbols={symbols}
      {...(filter ? { filter } : {})}
      watchlist={watchSymbols}
      onToggleWatch={toggleWatchlist}
      {...(empty ? { emptyLabel: empty } : {})}
      showMobileDetailRail={showMobileDetailRail}
    />
  );

  const body = () => {
    if (page === "ai") return <AIView />;

    const saved = page.startsWith("saved:")
      ? screeners.find((s) => `saved:${s.id}` === page)
      : undefined;

    const inner = (() => {
      if (saved) return <SavedScreenerView screenerId={saved.id} filters={saved.filters} name={saved.name} />;
      switch (page) {
        case "markets":
          return (
            <div className="space-y-6">
              <div className="market-brief">
                <div className="market-brief-copy">
                  <p className="market-kicker">Market intelligence</p>
                  <h2 className="market-brief-title">Momentum, breadth, and activity</h2>
                  <p className="market-brief-description">
                    A live research view of {cfg.label} equities, ranked and refreshed as market conditions change.
                  </p>
                </div>
                <div className="market-brief-meta" aria-label="Market context">
                  <span className="market-meta-chip"><span>Region</span><b>{cfg.label}</b></span>
                  <span className="market-meta-chip"><span>Coverage</span><b>Provider ranked</b></span>
                  <span className="market-meta-chip live"><span className="quiet-live-dot" aria-hidden="true" /><b>Live context</b></span>
                </div>
              </div>
              <MarketStrip />
              <MoversView />
              <SectorPerformanceHeatmap />
              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Sector & industry detail
                </h2>
                <SectorsView />
              </div>
            </div>
          );
        case "watchlist":
          return <WatchlistView />;
        case "news":
          return <NewsView />;
        case "alerts":
          return <AlertsView />;
        case "settings":
          return <SettingsView />;
        case "equities":
          return table(cfg.equities, undefined, undefined, false);
        case "etfs":
          return table(cfg.etfs);
        case "crypto":
          return table(CRYPTO_SYMS);
        case "forex":
          return table(FOREX_SYMS);
        case "movers-gainers":
          return <MoversView initialName="day_gainers" />;
        case "movers-losers":
          return <MoversView initialName="day_losers" />;
        case "movers-active":
          return <MoversView initialName="most_actives" />;
        case "movers":
          return <MoversView />;
        case "proscreener":
          return <ProScreenerView />;
        case "etfscreener":
          return <EtfScreenerView />;
        case "sectors":
          return <SectorsView />;
        case "calendars":
          return <CalendarsView />;
        case "globalmarkets":
          return <GlobalMarketsView />;
        case "options":
          return <OptionsView />;
        case "ownership":
          return <OwnershipView />;
        case "estimates":
          return <EstimatesView />;
        case "filings":
          return <FilingsView />;
        case "newssearch":
          return <NewsSearchView />;
        case "logout":
          return (
            <p className="text-sm text-muted-foreground">
              Local session only — your data stays in this browser.
            </p>
          );
        default: {
          const preset = PRESETS[page];
          if (preset) {
            return table(
              symbolsForMarketPreset(page, market),
              preset.test,
              "No tickers match this preset right now.",
            );
          }
          return <ProScreenerView />;
        }
      }
    })();

    return (
      <div className="h-full overflow-y-auto px-6 py-6">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {saved?.name ?? (page === "equities" ? `${cfg.label} Equities` : PAGE_TITLES[page]) ?? "Markets"}
          </h1>
          {inner}
        </div>
      </div>
    );
  };

  return (
    <DashboardShell
      page={page}
      onNavigate={setPage}
      watchlistCount={watchSymbols.length}
      alertCount={alerts.filter((a) => a.enabled).length}
      onRefresh={() => void qc.invalidateQueries()}
    >
      {body()}
    </DashboardShell>
  );
}
