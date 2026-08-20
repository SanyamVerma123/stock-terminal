import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Bell, BellRing, FolderPlus, Inbox, KeyRound, Star, Trash2 } from "lucide-react";
import { getMarketStrip, getNews, getRankedNews, getWatchlistNews } from "@/lib/finance.functions";
import { Sparkline } from "@/components/finance/Sparkline";
import { DeltaBadge } from "@/components/finance/DeltaBadge";
import { TickerAutocomplete } from "@/components/finance/TickerAutocomplete";
import { QuoteTable } from "@/components/dashboard/QuoteTable";
import { timeAgo } from "@/lib/format";
import { useAppState, useMarketConfig } from "@/lib/app-state";
import { MARKETS, type MarketId } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { listChatModels, type ChatModel } from "@/lib/models.functions";
import { DataLoading } from "@/components/ui/loading-state";
import { NewsTimeline } from "@/components/research/NewsTimeline";
import { ResearchWithAIButton } from "@/components/research/ResearchWithAIButton";

export type Alert = { id: string; symbol: string; above: boolean; price: number; enabled: boolean };

export function MarketStrip() {
  const cfg = useMarketConfig();
  const fn = useServerFn(getMarketStrip);
  const { data } = useQuery({
    queryKey: ["strip", cfg.id],
    queryFn: () => fn({ data: { indices: cfg.indices } }),
    staleTime: 60_000,
  });
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {(data ?? []).map((ix) => (
        <div key={ix.key} className="index-card rounded-2xl border border-border/70 bg-card/55 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{ix.label}</p><span className="index-card-live">Live</span></div>
          <p className="tabular mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {ix.last === null
              ? "—"
              : ix.last.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <div className="mt-1 flex items-center justify-between"><DeltaBadge value={ix.changePercent} size="sm" /><span className="text-[10px] text-muted-foreground">Today</span></div>
          <div className="mt-3">
            <Sparkline points={ix.points} up={(ix.changePercent ?? 0) >= 0} />
          </div>
          {(() => { const values = ix.points.map((point) => point.c).filter((value): value is number => value !== null); const low = Math.min(...values); const high = Math.max(...values); const position = ix.last !== null && high > low ? ((ix.last - low) / (high - low)) * 100 : 50; return values.length ? <div className="mt-3 border-t border-border/60 pt-2"><div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>1M low {low.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span>High {high.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div><span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted"><i className={cn("block h-full rounded-full", (ix.changePercent ?? 0) >= 0 ? "bg-positive" : "bg-negative")} style={{ width: `${Math.max(4, Math.min(100, position))}%` }} /></span></div> : null; })()}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Watchlist ---------------- */

export function WatchlistView() {
  const {
    watchlist,
    watchFolders,
    addToWatchlist,
    removeFromWatchlist,
    moveWatchToFolder,
    createWatchFolder,
    reorderWatchFolder,
    deleteWatchFolder,
    watchSymbols,
  } = useAppState();
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [folderName, setFolderName] = useState("");
  const activeFolder = selectedFolder === "all" ? null : watchFolders.find((folder) => folder.id === selectedFolder);
  const activeItems = selectedFolder === "all"
    ? watchlist
    : selectedFolder === "unfiled"
      ? watchlist.filter((item) => !item.folderId)
      : watchlist.filter((item) => item.folderId === selectedFolder);
  const folderColors = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  } as const;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Watchlist intelligence
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Keep the important names close
          </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Organize selected names into folders that stay with your cloud account while provider keys remain local.
          </p>
        </div>
        <span className="quiet-live-indicator hidden shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
          <span className="quiet-live-dot" aria-hidden="true" />
          Silent sync
        </span>
      </div>
      <section className="rounded-3xl border border-border/70 bg-card/55 p-6 shadow-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Build your watchlist</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Track the companies that matter to your next decision.
            </p>
          </div>
          <span className="rounded-full border border-positive/30 bg-positive/10 px-2.5 py-1 text-[10px] text-positive">
            Live data
          </span>
        </div>
        <TickerAutocomplete
          className="mt-4 max-w-xl"
          onSelect={(symbol, name) => addToWatchlist(symbol, name)}
          placeholder="Search any company or ticker…"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          New tickers are auto-categorised by sector and industry from live company data.
        </p>
      </section>
      <section className="rounded-3xl border border-border/70 bg-card/55 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Folders</p>
            <p className="mt-1 text-xs text-muted-foreground">Create a concise group, then assign tracked symbols to it below.</p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); createWatchFolder(folderName); setFolderName(""); }} className="flex w-full gap-2 sm:w-auto">
            <input value={folderName} onChange={(event) => setFolderName(event.target.value)} maxLength={48} placeholder="e.g. Long-term ideas" className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary/60 sm:w-48" />
            <button type="submit" disabled={!folderName.trim()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary/40 px-3 text-xs font-medium text-primary disabled:opacity-50"><FolderPlus className="h-3.5 w-3.5" /> Add</button>
          </form>
        </div>
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => setSelectedFolder("all")} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs", selectedFolder === "all" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>All tracked <span className="ml-1 opacity-60">{watchlist.length}</span></button>
          <button type="button" onClick={() => setSelectedFolder("unfiled")} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs", selectedFolder === "unfiled" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>Unfiled <span className="ml-1 opacity-60">{watchlist.filter((item) => !item.folderId).length}</span></button>
          {watchFolders.map((folder) => <button key={folder.id} type="button" onClick={() => setSelectedFolder(folder.id)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs", selectedFolder === folder.id ? folderColors[folder.color] : "border-border text-muted-foreground hover:text-foreground")}>{folder.name} <span className="ml-1 opacity-60">{watchlist.filter((item) => item.folderId === folder.id).length}</span></button>)}
        </div>
      </section>
      {watchlist.length > 0 && (
        <>
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Watchlist folder</p>
            <div className="mt-1 flex items-baseline gap-2">
              <h3 className="text-xl font-semibold text-foreground">{selectedFolder === "all" ? "All tracked names" : selectedFolder === "unfiled" ? "Unfiled names" : activeFolder?.name ?? "Folder"}</h3>
              <span className="text-xs text-muted-foreground">
                {activeItems.length} tracked name{activeItems.length === 1 ? "" : "s"}
              </span>
              {activeFolder ? <div className="ml-auto flex items-center gap-1"><button type="button" onClick={() => reorderWatchFolder(activeFolder.id, "up")} className="rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Move folder up"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" onClick={() => reorderWatchFolder(activeFolder.id, "down")} className="rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Move folder down"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => { deleteWatchFolder(activeFolder.id); setSelectedFolder("all"); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-negative"><Trash2 className="h-3.5 w-3.5" /> Delete folder</button></div> : null}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeItems.map((item) => <label key={item.symbol} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/45 px-3 py-2 text-xs"><span className="min-w-0 truncate font-medium text-foreground">{item.symbol}</span><select value={item.folderId ?? ""} onChange={(event) => moveWatchToFolder(item.symbol, event.target.value || undefined)} className="max-w-[145px] rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground"><option value="">Unfiled</option>{watchFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>)}
            </div>
            <div className="mt-3 flex items-center justify-end text-[11px] text-muted-foreground">
              <span className="quiet-live-dot mr-1.5" aria-hidden="true" />
              <span className="sr-only">Live updates active</span>
            </div>
            <div className="mt-1">
              {activeItems.length > 0 ? (
                <QuoteTable
                  symbols={activeItems.map((item) => item.symbol)}
                  watchlist={watchSymbols}
                  onToggleWatch={(symbol) => removeFromWatchlist(symbol)}
                />
              ) : (
                <p className="rounded-2xl border border-border/70 bg-card/55 p-8 text-sm text-muted-foreground">
                  No tracked names in this folder.
                </p>
              )}
            </div>
          </section>
        </>
      )}
      {watchlist.length === 0 && (
        <p className="rounded-2xl border border-border/70 bg-card/55 p-8 text-sm text-muted-foreground">
          Your watchlist is empty — search above to add your first ticker.
        </p>
      )}
    </div>
  );
}

/* ---------------- News ---------------- */

export function NewsView() {
  const { watchSymbols } = useAppState();
  const [symbol, setSymbol] = useState<string | null>(null);
  const watchFn = useServerFn(getWatchlistNews);
  const oneFn = useServerFn(getNews);
  const rankedFn = useServerFn(getRankedNews);

  const { data: feed, isLoading } = useQuery({
    queryKey: ["watchnews", watchSymbols.join(",")],
    queryFn: () => watchFn({ data: { symbols: watchSymbols.join(",") } }),
    enabled: !symbol && watchSymbols.length > 0,
    staleTime: 120_000,
  });
  const { data: single, isLoading: loadingSingle } = useQuery({
    queryKey: ["news", symbol],
    queryFn: () => oneFn({ data: { symbol: symbol! } }),
    enabled: Boolean(symbol),
    staleTime: 120_000,
  });
  const { data: rankedSingle } = useQuery({
    queryKey: ["ranked-news", symbol],
    queryFn: () => rankedFn({ data: { symbol: symbol! } }),
    enabled: Boolean(symbol),
    staleTime: 120_000,
  });
  const rankedWatch = useQueries({
    queries: watchSymbols.slice(0, 6).map((watchSymbol) => ({
      queryKey: ["ranked-news", watchSymbol],
      queryFn: () => rankedFn({ data: { symbol: watchSymbol } }),
      enabled: !symbol,
      staleTime: 120_000,
    })),
  });
  const rankedWatchItems = rankedWatch.flatMap((query, index) =>
    (query.data ?? []).map((item) => ({ ...item, ...(watchSymbols[index] ? { symbol: watchSymbols[index] } : {}) })),
  );

  const items = symbol ? (rankedSingle ?? single ?? []).map((n) => ({ ...n, symbol })) : rankedWatchItems.length > 0 ? rankedWatchItems : (feed ?? []);
  const busy = symbol ? loadingSingle : isLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card/55 p-4">
        <TickerAutocomplete
          className="w-full max-w-sm"
          onSelect={(s) => setSymbol(s)}
          placeholder="Search news for a specific company…"
        />
        <button
          type="button"
          onClick={() => setSymbol(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs",
            symbol
              ? "border-border text-muted-foreground hover:text-foreground"
              : "border-primary/50 bg-primary/10 text-primary",
          )}
        >
          Watchlist feed
        </button>
        {symbol && (
          <span className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs text-primary">
            {symbol}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/55 p-4">
        {busy && <DataLoading compact label="Loading market headlines" detail="Collecting the latest research and company coverage." />}
        {!busy && <NewsTimeline items={items} empty={watchSymbols.length === 0 && !symbol ? "Add tickers to your watchlist to build a news feed." : "No headlines right now."} />}
        {!busy && items.length > 0 ? <div className="mt-4 border-t border-border pt-4"><ResearchWithAIButton prompt={`Research the most important recent ${symbol ? `${symbol} ` : "watchlist "}news. Explain verified facts, likely market relevance, and uncertainty.`} /></div> : null}
      </div>
    </div>
  );
}

/* ---------------- Alerts ---------------- */

export function AlertsView() {
  const { alerts, setAlerts, watchlist, screenerNotifications, markScreenerNotificationsRead } = useAppState();
  const [symbol, setSymbol] = useState(watchlist[0]?.symbol ?? "AAPL");
  const [price, setPrice] = useState("");
  const [above, setAbove] = useState(true);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-primary/25 bg-card/55">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2"><Inbox className="h-4 w-4 text-primary" /><div><p className="text-sm font-medium text-foreground">Screener match inbox</p><p className="text-[11px] text-muted-foreground">Cloud-synced match updates from enabled saved screeners.</p></div></div>
          {screenerNotifications.some((notification) => !notification.read) ? <button type="button" onClick={markScreenerNotificationsRead} className="text-xs text-primary hover:underline">Mark all read</button> : null}
        </div>
        {screenerNotifications.length === 0 ? <p className="p-4 text-xs text-muted-foreground">No screener changes have been detected yet. Enable an alert from a saved screener to begin periodic cloud monitoring and in-session browser alerts.</p> : <div className="divide-y divide-border/60">{screenerNotifications.slice(0, 12).map((notification) => <div key={notification.id} className={cn("px-4 py-3", notification.read ? "opacity-70" : "bg-primary/[0.035]")}><div className="flex items-start gap-2"><span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", notification.read ? "bg-muted-foreground/40" : "bg-primary")} /><div className="min-w-0"><p className="text-xs font-medium text-foreground">{notification.screenerName} has a new match set</p><p className="mt-1 truncate text-xs text-muted-foreground">{notification.symbols.join(", ") || "The live provider returned matching equities."}</p><p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(notification.createdAt)}</p></div></div></div>)}</div>}
      </section>
      <div className="rounded-2xl border border-border/70 bg-card/55 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">New price alert</p>
        <div className="flex flex-wrap items-center gap-2">
          <TickerAutocomplete
            className="w-56"
            value={symbol}
            onSelect={(s) => setSymbol(s)}
            scope={watchlist.map((w) => ({ symbol: w.symbol, name: w.name }))}
            placeholder="Watchlist ticker"
          />
          <select
            value={above ? "above" : "below"}
            onChange={(e) => setAbove(e.target.value === "above")}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
          >
            <option value="above">Rises above</option>
            <option value="below">Falls below</option>
          </select>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            inputMode="decimal"
            className="h-9 w-28 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/60"
          />
          <button
            type="button"
            disabled={!symbol || !Number(price)}
            onClick={() => {
              setAlerts([
                ...alerts,
                { id: crypto.randomUUID(), symbol, above, price: Number(price), enabled: true },
              ]);
              setPrice("");
            }}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Create alert
          </button>
        </div>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border/70 bg-card/55">
        {alerts.length === 0 && (
          <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Bell className="h-4 w-4" /> No alerts yet.
          </p>
        )}
        {alerts.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
            <span className="text-sm font-semibold text-foreground">{a.symbol}</span>
            <span className="text-sm text-muted-foreground">
              {a.above ? "rises above" : "falls below"}{" "}
              <span className="tabular text-foreground">{a.price}</span>
            </span>
            <button
              type="button"
              onClick={() =>
                setAlerts(alerts.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)))
              }
              className={cn(
                "ml-auto rounded-full border px-2.5 py-1 text-[11px]",
                a.enabled
                  ? "border-positive/40 text-positive"
                  : "border-border text-muted-foreground",
              )}
            >
              {a.enabled ? "Active" : "Paused"}
            </button>
            <button
              type="button"
              onClick={() => setAlerts(alerts.filter((x) => x.id !== a.id))}
              className="rounded-md p-1.5 text-muted-foreground hover:text-negative"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */

export function SettingsView() {
  const {
    refreshSeconds,
    setRefreshSeconds,
    market,
    setMarket,
    apiKeys,
    setApiKeys,
    screeners,
    deleteScreener,
    theme,
    setTheme,
    cloudAccount,
    cloudStatus,
    cloudError,
    signIntoCloud,
    signOutOfCloud,
    browserNotificationPermission,
    requestBrowserNotifications,
  } = useAppState();
  const modelsFn = useServerFn(listChatModels);
  const { data: modelCatalog } = useQuery({
    queryKey: [
      "settings-chat-models",
      apiKeys.openrouter,
      apiKeys.openrouterFallback,
      apiKeys.kilo,
      apiKeys.kiloFallback,
      apiKeys.groq,
      apiKeys.groqFallback,
      apiKeys.together,
      apiKeys.togetherFallback,
      apiKeys.deepseek,
      apiKeys.deepseekFallback,
      apiKeys.opencode,
      apiKeys.opencodeFallback,
    ],
    queryFn: () =>
      modelsFn({
        data: {
          openrouterKey: apiKeys.openrouter,
          openrouterFallbackKey: apiKeys.openrouterFallback ?? "",
          kiloKey: apiKeys.kilo,
          kiloFallbackKey: apiKeys.kiloFallback ?? "",
          groqKey: apiKeys.groq,
          groqFallbackKey: apiKeys.groqFallback ?? "",
          togetherKey: apiKeys.together,
          togetherFallbackKey: apiKeys.togetherFallback ?? "",
          deepseekKey: apiKeys.deepseek,
          deepseekFallbackKey: apiKeys.deepseekFallback ?? "",
          opencodeKey: apiKeys.opencode,
          opencodeFallbackKey: apiKeys.opencodeFallback ?? "",
        },
      }),
    staleTime: 600_000,
  });
  const [draft, setDraft] = useState(() => ({
    openrouter: apiKeys.openrouter,
    openrouterFallback: apiKeys.openrouterFallback ?? "",
    kilo: apiKeys.kilo,
    kiloFallback: apiKeys.kiloFallback ?? "",
    groq: apiKeys.groq,
    groqFallback: apiKeys.groqFallback ?? "",
    together: apiKeys.together,
    togetherFallback: apiKeys.togetherFallback ?? "",
    deepseek: apiKeys.deepseek,
    deepseekFallback: apiKeys.deepseekFallback ?? "",
    opencode: apiKeys.opencode,
    opencodeFallback: apiKeys.opencodeFallback ?? "",
    tinyfish: apiKeys.tinyfish,
  }));
  const [preferredModel, setPreferredModel] = useState(
    apiKeys.preferredModel ?? "openrouter:openrouter/free",
  );
  const [customProvider, setCustomProvider] = useState<
    "openrouter" | "kilo" | "groq" | "together" | "deepseek" | "opencode"
  >("openrouter");
  const [customModelId, setCustomModelId] = useState("");
  const [customModelLabel, setCustomModelLabel] = useState("");
  const [saved, setSaved] = useState(false);
  const [accountMode, setAccountMode] = useState<"login" | "register">("login");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetToken] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("resetToken") ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const field =
    "mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/60";
  const preferredProvider = preferredModel.split(":", 1)[0];
  const configuredProviders = modelCatalog?.configuredProviders;
  const modelGroups = ([
    { label: "OpenRouter", provider: "openrouter" },
    { label: "Kilo AI", provider: "kilo" },
    { label: "Groq", provider: "groq" },
    { label: "Together AI", provider: "together" },
    { label: "DeepSeek", provider: "deepseek" },
    { label: "OpenCode Zen", provider: "opencode" },
  ] as const).filter(({ provider }) => configuredProviders?.[provider] ?? false).map(({ label, provider }) => {
    const baseModels: ChatModel[] = (modelCatalog?.models ?? []).filter(
      (model) => model.provider === provider,
    );
    const customModels: ChatModel[] = (apiKeys.customModels ?? [])
      .filter((model) => model.provider === provider)
      .map((model) => ({ id: model.id, label: model.label, provider: model.provider }));
    const unique = [...baseModels, ...customModels].filter(
      (model, index, all) => all.findIndex((candidate) => candidate.id === model.id) === index,
    );
    if (
      preferredProvider === provider &&
      preferredModel &&
      !unique.some((model) => model.id === preferredModel)
    ) {
      unique.unshift({
        id: preferredModel,
        label: preferredModel.split(":").slice(1).join(":") || preferredModel,
        provider: provider as ChatModel["provider"],
      });
    }
    return { label, provider, models: unique };
  });
  const updateDraft = (key: keyof typeof draft, value: string) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const selectPreferredModel = (value: string) => {
    setPreferredModel(value);
    setApiKeys({ ...apiKeys, preferredModel: value });
  };
  const saveSettings = () => {
    const { lovable: _lovable, ...withoutLovable } = apiKeys;
    setApiKeys({
      ...withoutLovable,
      ...draft,
      ...(preferredModel.trim() ? { preferredModel: preferredModel.trim() } : {}),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  const addCustomModel = () => {
    const id = customModelId.trim();
    if (!id) return;
    const model = {
      id: id.includes(":") ? id : `${customProvider}:${id}`,
      label: customModelLabel.trim() || id,
      provider: customProvider,
    };
    setApiKeys({
      ...apiKeys,
      customModels: [...(apiKeys.customModels ?? []).filter((item) => item.id !== model.id), model],
    });
    setCustomModelId("");
    setCustomModelLabel("");
  };
  const removeCustomModel = (id: string) =>
    setApiKeys({
      ...apiKeys,
      customModels: (apiKeys.customModels ?? []).filter((item) => item.id !== id),
    });
  const providers = [
    ["OpenRouter", "openrouter", "openrouterFallback"],
    ["Kilo AI", "kilo", "kiloFallback"],
    ["Groq", "groq", "groqFallback"],
    ["Together AI", "together", "togetherFallback"],
    ["DeepSeek", "deepseek", "deepseekFallback"],
    ["OpenCode Zen", "opencode", "opencodeFallback"],
  ] as const;
  const configuredProviderOptions = providers.filter(([, provider]) =>
    configuredProviders?.[provider] ?? false,
  );
  const postCloudAuth = async (payload: Record<string, string>) => {
    const response = await fetch("/api/cloud/auth", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) throw new Error(result.error ?? "Account action failed.");
    return result;
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-2xl border border-primary/25 bg-card/55 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Cloud account & sync</p>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              Save your terminal preferences, watchlist, alerts, saved screeners, and model choices to your account. Provider API keys remain only on this device.
            </p>
          </div>
          <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-medium", cloudStatus === "ready" ? "border-positive/30 bg-positive/10 text-positive" : cloudStatus === "syncing" || cloudStatus === "checking" ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
            {cloudStatus === "ready" ? "Cloud synced" : cloudStatus === "syncing" || cloudStatus === "checking" ? "Syncing" : cloudStatus === "error" ? "Sync issue" : "Local only"}
          </span>
        </div>
        {cloudAccount ? (
          <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-background/25 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-sm font-medium text-foreground">{cloudAccount.displayName || cloudAccount.email}</p><p className="text-xs text-muted-foreground">{cloudAccount.email} · changes save automatically</p></div>
              <button type="button" onClick={() => void signOutOfCloud()} className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-negative/40 hover:text-negative">Sign out</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              <span className="rounded-full border border-positive/30 bg-positive/10 px-2.5 py-1 text-[11px] text-positive">Password sign-in active</span>
              <button type="button" onClick={() => void requestBrowserNotifications().then((permission) => setAccountMessage(permission === "granted" ? "Browser notifications are enabled for this device." : permission === "unsupported" ? "This browser does not support notifications." : "Browser notifications remain blocked."))} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground"><BellRing className="h-3.5 w-3.5" /> Browser alerts: {browserNotificationPermission === "granted" ? "on" : "off"}</button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void postCloudAuth({ action: "change_password", currentPassword, newPassword }).then(() => { setCurrentPassword(""); setNewPassword(""); setAccountMessage("Password updated. Other devices were signed out."); }, (error: unknown) => setAccountMessage(error instanceof Error ? error.message : "Unable to change password.")); }} className="grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-[1fr_1fr_auto]">
              <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" placeholder="Current password" autoComplete="current-password" className={field.replace("mt-1 ", "")} />
              <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" minLength={10} placeholder="New password (10+ characters)" autoComplete="new-password" className={field.replace("mt-1 ", "")} />
              <button type="submit" disabled={!currentPassword || newPassword.length < 10} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"><KeyRound className="h-3.5 w-3.5" /> Change password</button>
            </form>
          </div>
        ) : (
          resetToken ? <form onSubmit={(event) => { event.preventDefault(); void postCloudAuth({ action: "confirm_reset", token: resetToken, password: accountPassword }).then(() => { setAccountMessage("Password reset. You are now signed in."); window.history.replaceState({}, "", window.location.pathname); window.location.reload(); }, (error: unknown) => setAccountMessage(error instanceof Error ? error.message : "Unable to reset password.")); }} className="mt-4 grid gap-2 md:grid-cols-2">
            <p className="text-xs leading-5 text-muted-foreground md:col-span-2">Set a new password for your cloud account. This one-time link expires after 30 minutes.</p>
            <input value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} placeholder="New password (10+ characters)" type="password" autoComplete="new-password" minLength={10} required className={field.replace("mt-1 ", "")} />
            <button type="submit" disabled={accountPassword.length < 10} className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground disabled:opacity-60">Reset password</button>
          </form> : showResetRequest ? <form onSubmit={(event) => { event.preventDefault(); void postCloudAuth({ action: "request_reset", email: accountEmail }).then((result) => setAccountMessage(result.message ?? "If an account exists, a reset link has been sent."), (error: unknown) => setAccountMessage(error instanceof Error ? error.message : "Unable to request reset.")); }} className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
            <input value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="Email address" type="email" autoComplete="email" required className={field.replace("mt-1 ", "")} />
            <button type="submit" className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground">Email reset link</button>
            <button type="button" onClick={() => setShowResetRequest(false)} className="text-left text-xs text-muted-foreground hover:text-foreground md:col-span-2">Back to sign in</button>
          </form> : <form onSubmit={(event) => { event.preventDefault(); void signIntoCloud({ mode: accountMode, email: accountEmail, password: accountPassword, ...(accountMode === "register" && accountName.trim() ? { displayName: accountName } : {}) }).then((success) => { if (success) { setAccountPassword(""); if (accountMode === "register") setAccountMessage("Account created. You can now sign in with this email and password."); } }); }} className="mt-4 grid gap-2 md:grid-cols-2">
            <div className="flex gap-1 rounded-lg border border-border/70 bg-background/25 p-1 md:col-span-2">
              <button type="button" onClick={() => setAccountMode("login")} className={cn("flex-1 rounded-md px-3 py-1.5 text-xs font-medium", accountMode === "login" ? "bg-primary/10 text-primary" : "text-muted-foreground")}>Sign in</button>
              <button type="button" onClick={() => setAccountMode("register")} className={cn("flex-1 rounded-md px-3 py-1.5 text-xs font-medium", accountMode === "register" ? "bg-primary/10 text-primary" : "text-muted-foreground")}>Create account</button>
            </div>
            {accountMode === "register" ? <input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Display name (optional)" autoComplete="name" className={field.replace("mt-1 ", "")} /> : null}
            <input value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="Email address" type="email" autoComplete="email" required className={field.replace("mt-1 ", "")} />
            <input value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} placeholder={accountMode === "register" ? "Password (10+ characters)" : "Password"} type="password" autoComplete={accountMode === "register" ? "new-password" : "current-password"} minLength={10} required className={field.replace("mt-1 ", "")} />
            <button type="submit" disabled={cloudStatus === "syncing" || cloudStatus === "checking"} className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground disabled:opacity-60 md:col-span-2">{cloudStatus === "syncing" ? "Working…" : accountMode === "register" ? "Create account & sync" : "Sign in & sync"}</button>
            {accountMode === "login" ? <button type="button" onClick={() => setShowResetRequest(true)} className="text-left text-xs text-muted-foreground hover:text-foreground md:col-span-2">Forgot password?</button> : null}
          </form>
        )}
        {accountMessage ? <p role="status" className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">{accountMessage}</p> : null}
        {cloudError ? <p role="status" className="mt-3 rounded-lg border border-negative/25 bg-negative/5 px-3 py-2 text-xs text-negative">{cloudError}</p> : null}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/55 p-5">
        <p className="text-sm font-medium text-foreground">Equity market</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Switch indices, screeners, heatmaps and terminal context between US and India.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(MARKETS) as MarketId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setMarket(id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs",
                market === id
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {MARKETS[id].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Current market:{" "}
          <span className="font-medium text-foreground">{MARKETS[market].label}</span>. Crypto and
          forex remain global.
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/55 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">AI providers</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Primary and fallback keys stay local to this browser. No Lovable field is used.
            </p>
          </div>
          <span className="rounded-full border border-positive/30 bg-positive/10 px-2.5 py-1 text-[10px] text-positive">
            Multi-provider routing
          </span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {providers.map(([label, primary, fallback]) => (
            <div key={primary} className="rounded-xl border border-border/60 bg-background/25 p-3">
              <p className="text-xs font-medium text-foreground">{label}</p>
              <label className="mt-2 block text-[11px] text-muted-foreground">
                Primary
                <input
                  value={draft[primary]}
                  onChange={(e) => updateDraft(primary, e.target.value)}
                  type="password"
                  placeholder="API key"
                  className={field}
                />
              </label>
              <label className="mt-2 block text-[11px] text-muted-foreground">
                Fallback
                <input
                  value={draft[fallback]}
                  onChange={(e) => updateDraft(fallback, e.target.value)}
                  type="password"
                  placeholder="Optional fallback key"
                  className={field}
                />
              </label>
            </div>
          ))}
        </div>
        <label className="mt-4 block text-xs text-muted-foreground">
          TinyFish web-search key
          <input
            value={draft.tinyfish}
            onChange={(e) => updateDraft("tinyfish", e.target.value)}
            type="password"
            placeholder="Optional web-search provider key"
            className={field}
          />
        </label>
        <button
          type="button"
          onClick={saveSettings}
          className="mt-4 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {saved ? "Saved" : "Save provider settings"}
        </button>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/55 p-5">
        <p className="text-sm font-medium text-foreground">Preferred analyst model</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose from models available through providers with a saved API key. Kilo models appear here after its key is saved.
        </p>
        <select
          value={preferredModel}
          onChange={(e) => selectPreferredModel(e.target.value)}
          className={`${field} max-w-xl`}
        >
          {modelGroups.map((group) =>
            group.models.length > 0 ? (
              <optgroup key={group.label} label={group.label}>
                {group.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                    {model.note ? ` · ${model.note}` : ""}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
          {modelGroups.length === 0 ? <option value="">Save a provider key to load its models</option> : null}
        </select>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/55 p-5">
        <p className="text-sm font-medium text-foreground">Custom model registry</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add a model ID only for a provider with a saved API key.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-[150px_1fr_1fr_auto]">
          <select
            value={customProvider}
            onChange={(e) => setCustomProvider(e.target.value as typeof customProvider)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
          >
            {configuredProviderOptions.map(([label, id]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={customModelId}
            onChange={(e) => setCustomModelId(e.target.value)}
            placeholder="provider model ID"
            className={field.replace("mt-1 ", "")}
          />
          <input
            value={customModelLabel}
            onChange={(e) => setCustomModelLabel(e.target.value)}
            placeholder="Display label"
            className={field.replace("mt-1 ", "")}
          />
          <button
            type="button"
            onClick={addCustomModel}
            disabled={configuredProviderOptions.length === 0}
            className="h-9 rounded-lg border border-primary/40 px-3 text-xs text-primary"
          >
            Add
          </button>
        </div>
        {configuredProviderOptions.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Save a provider key above to register custom models.</p> : null}
        {(apiKeys.customModels ?? []).length > 0 && (
          <div className="mt-3 space-y-2">
            {apiKeys.customModels?.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"
              >
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="truncate text-muted-foreground">{item.id}</span>
                <button
                  type="button"
                  onClick={() => removeCustomModel(item.id)}
                  className="ml-auto text-muted-foreground hover:text-negative"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card/55 p-5">
          <p className="text-sm font-medium text-foreground">Live data refresh</p>
          <p className="mt-1 text-xs text-muted-foreground">
            How often quote tables re-poll market data.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[30, 60, 120, 300].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRefreshSeconds(s)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs",
                  refreshSeconds === s
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/55 p-5">
          <p className="text-sm font-medium text-foreground">Theme</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Switch between terminal, light, paper, and NeuBorder treatments.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["terminal", "light", "paper", "neuborder"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs capitalize",
                  theme === value
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "neuborder" ? "NeuBorder" : value}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/55 p-5">
        <p className="text-sm font-medium text-foreground">Saved screeners</p>
        {screeners.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Build one in the Screener and save it — it appears under Screener Presets.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {screeners.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm text-foreground">
                <Star className="h-3.5 w-3.5 text-primary" />
                {s.name}
                <button
                  type="button"
                  onClick={() => deleteScreener(s.id)}
                  className="ml-auto text-muted-foreground hover:text-negative"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
