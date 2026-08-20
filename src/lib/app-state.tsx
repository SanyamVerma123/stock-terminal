import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { classifySymbols } from "@/lib/finance.functions";
import { MARKETS, type MarketId } from "@/lib/markets";
import type { CloudAccount, CloudSyncState } from "@/lib/cloud-types";

export type AssetClass = "equities" | "etfs" | "crypto" | "forex";
export type Theme = "terminal" | "light" | "paper" | "neuborder";

export type WatchItem = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketId: MarketId;
  assetClass: AssetClass;
};

export type Alert = { id: string; symbol: string; above: boolean; price: number; enabled: boolean };

export type ScreenerFilters = {
  region: string;
  sector: string;
  industry?: string;
  size: number;
  minMarketCap: string;
  maxMarketCap: string;
  minPe: string;
  maxPe: string;
  minGrowth: string;
  minDividendYield: string;
  minPrice: string;
  maxPrice: string;
  minVolume: string;
  minChangePercent: string;
  maxChangePercent: string;
  exchange: string;
  nameContains: string;
  sortField: string;
  sortAscending: boolean;
};

export const EMPTY_FILTERS: ScreenerFilters = {
  region: "us",
  sector: "",
  industry: "",
  size: 50,
  minMarketCap: "",
  maxMarketCap: "",
  minPe: "",
  maxPe: "",
  minGrowth: "",
  minDividendYield: "",
  minPrice: "",
  maxPrice: "",
  minVolume: "",
  minChangePercent: "",
  maxChangePercent: "",
  exchange: "",
  nameContains: "",
  sortField: "intradaymarketcap",
  sortAscending: false,
};

export type SavedScreener = {
  id: string;
  name: string;
  filters: ScreenerFilters;
  marketId?: MarketId;
  assetClass?: AssetClass;
};

export type AIProviderId = "openrouter" | "kilo" | "groq" | "together" | "deepseek" | "opencode";

export type CustomAIModel = {
  id: string;
  label: string;
  provider: AIProviderId;
};

export type ApiKeys = {
  lovable?: string;
  openrouter: string;
  openrouterFallback?: string;
  kilo: string;
  kiloFallback?: string;
  groq: string;
  groqFallback?: string;
  together: string;
  togetherFallback?: string;
  deepseek: string;
  deepseekFallback?: string;
  opencode: string;
  opencodeFallback?: string;
  tinyfish: string;
  preferredModel?: string;
  customModels?: CustomAIModel[];
};

export type CloudStatus = "checking" | "anonymous" | "syncing" | "ready" | "error";

export type CloudCredentials = {
  mode: "login" | "register";
  email: string;
  password: string;
  displayName?: string;
};

type State = {
  market: MarketId;
  setMarket: (m: MarketId) => void;
  assetClass: AssetClass;
  setAssetClass: (assetClass: AssetClass) => void;
  watchlist: WatchItem[];
  isWatched: (symbol: string) => boolean;
  addToWatchlist: (symbol: string, name?: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  toggleWatchlist: (symbol: string, name?: string) => void;
  watchSymbols: string[];
  alerts: Alert[];
  setAlerts: (a: Alert[]) => void;
  screeners: SavedScreener[];
  saveScreener: (s: SavedScreener) => void;
  deleteScreener: (id: string) => void;
  apiKeys: ApiKeys;
  setApiKeys: (k: ApiKeys) => void;
  cloudAccount: CloudAccount | null;
  cloudStatus: CloudStatus;
  cloudError: string | null;
  signIntoCloud: (credentials: CloudCredentials) => Promise<boolean>;
  signOutOfCloud: () => Promise<void>;
  refreshSeconds: number;
  setRefreshSeconds: (n: number) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  aiPrefill: string | null;
  setAiPrefill: (prompt: string | null) => void;
};

const Ctx = createContext<State | null>(null);

export function loadLocalState<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocalState<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function normalizeApiKeys(raw: unknown): ApiKeys {
  const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = (key: string) => (typeof item[key] === "string" ? item[key] : "");
  const providers: AIProviderId[] = [
    "openrouter",
    "kilo",
    "groq",
    "together",
    "deepseek",
    "opencode",
  ];
  const customModels = Array.isArray(item["customModels"])
    ? item["customModels"].flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const candidate = entry as Record<string, unknown>;
        const id = typeof candidate["id"] === "string" ? candidate["id"].trim() : "";
        const label = typeof candidate["label"] === "string" ? candidate["label"].trim() : "";
        const provider = candidate["provider"];
        if (
          !id ||
          !label ||
          typeof provider !== "string" ||
          !providers.includes(provider as AIProviderId)
        ) {
          return [];
        }
        return [{ id, label, provider: provider as AIProviderId }];
      })
    : [];
  return {
    openrouter: text("openrouter"),
    openrouterFallback: text("openrouterFallback"),
    kilo: text("kilo"),
    kiloFallback: text("kiloFallback"),
    groq: text("groq"),
    groqFallback: text("groqFallback"),
    together: text("together"),
    togetherFallback: text("togetherFallback"),
    deepseek: text("deepseek"),
    deepseekFallback: text("deepseekFallback"),
    opencode: text("opencode"),
    opencodeFallback: text("opencodeFallback"),
    tinyfish: text("tinyfish"),
    preferredModel:
      typeof item["preferredModel"] === "string" && item["preferredModel"] && item["preferredModel"] !== "openrouter:openai/gpt-4o-mini"
        ? item["preferredModel"]
        : "openrouter:openrouter/free",
    customModels,
  };
}

async function cloudRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Cloud sync failed.");
  return payload;
}

function inferScope(symbol: string): { marketId: MarketId; assetClass: AssetClass } {
  if (symbol.endsWith("-USD")) return { marketId: "US", assetClass: "crypto" };
  if (symbol.endsWith("=X")) return { marketId: "US", assetClass: "forex" };
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO"))
    return { marketId: "IN", assetClass: "equities" };
  return { marketId: "US", assetClass: "equities" };
}

function normalizeWatchlist(raw: unknown): WatchItem[] {
  if (!Array.isArray(raw)) return DEFAULT_WATCH;
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const symbol = typeof item["symbol"] === "string" ? item["symbol"].toUpperCase() : "";
    if (!symbol) return [];
    const inferred = inferScope(symbol);
    const marketId =
      item["marketId"] === "US" || item["marketId"] === "IN" ? item["marketId"] : inferred.marketId;
    const assetClass = ["equities", "etfs", "crypto", "forex"].includes(String(item["assetClass"]))
      ? (item["assetClass"] as AssetClass)
      : inferred.assetClass;
    return [
      {
        symbol,
        name: typeof item["name"] === "string" ? item["name"] : symbol,
        sector: typeof item["sector"] === "string" ? item["sector"] : "",
        industry: typeof item["industry"] === "string" ? item["industry"] : "",
        marketId: marketId as MarketId,
        assetClass,
      },
    ];
  });
}

const DEFAULT_WATCH: WatchItem[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "",
    industry: "",
    marketId: "US",
    assetClass: "equities",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    sector: "",
    industry: "",
    marketId: "US",
    assetClass: "equities",
  },
  {
    symbol: "TCS.NS",
    name: "Tata Consultancy Services",
    sector: "",
    industry: "",
    marketId: "IN",
    assetClass: "equities",
  },
];

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [market, setMarketState] = useState<MarketId>("US");
  const [assetClass, setAssetClassState] = useState<AssetClass>("equities");
  const [allWatchlist, setAllWatchlist] = useState<WatchItem[]>(DEFAULT_WATCH);
  const [alerts, setAlertsState] = useState<Alert[]>([]);
  const [allScreeners, setAllScreeners] = useState<SavedScreener[]>([]);
  const [apiKeys, setApiKeysState] = useState<ApiKeys>({
    openrouter: "",
    kilo: "",
    groq: "",
    together: "",
    deepseek: "",
    opencode: "",
    tinyfish: "",
    preferredModel: "openrouter:openrouter/free",
    customModels: [],
  });
  const [refreshSeconds, setRefreshState] = useState(60);
  const [theme, setThemeState] = useState<Theme>("paper");
  const [aiPrefill, setAiPrefillState] = useState<string | null>(null);
  const [cloudAccount, setCloudAccount] = useState<CloudAccount | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("checking");
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const classify = useServerFn(classifySymbols);

  useEffect(() => {
    const storedMarket = loadLocalState<MarketId>("sc:market", "US");
    const storedAssetClass = loadLocalState<AssetClass>("sc:asset-class", "equities");
    setMarketState(storedMarket);
    setAssetClassState(storedMarket === "IN" ? "equities" : storedAssetClass);
    setAllWatchlist(normalizeWatchlist(loadLocalState<unknown>("sc:watchlist2", DEFAULT_WATCH)));
    setAlertsState(loadLocalState<Alert[]>("sc:alerts", []));
    setAllScreeners(loadLocalState<SavedScreener[]>("sc:screeners", []));
    setApiKeysState(normalizeApiKeys(loadLocalState<unknown>("sc:apikeys", null)));
    setRefreshState(loadLocalState<number>("sc:refresh", 60));
    const storedTheme = loadLocalState<Theme>("sc:theme", "paper");
    setThemeState(
      (["terminal", "light", "paper", "neuborder"] as Theme[]).includes(storedTheme)
        ? storedTheme
        : "paper",
    );
  }, []);

  const applyCloudState = useCallback((state: CloudSyncState) => {
    if (state.market) {
      setMarketState(state.market);
      saveLocalState("sc:market", state.market);
    }
    if (state.assetClass) {
      setAssetClassState(state.assetClass);
      saveLocalState("sc:asset-class", state.assetClass);
    }
    if (state.watchlist) {
      const next = normalizeWatchlist(state.watchlist);
      setAllWatchlist(next);
      saveLocalState("sc:watchlist2", next);
    }
    if (state.alerts) {
      const next = state.alerts.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const candidate = item as Record<string, unknown>;
        if (
          typeof candidate["id"] !== "string" ||
          typeof candidate["symbol"] !== "string" ||
          typeof candidate["above"] !== "boolean" ||
          typeof candidate["price"] !== "number" ||
          typeof candidate["enabled"] !== "boolean"
        ) return [];
        return [{
          id: candidate["id"],
          symbol: candidate["symbol"],
          above: candidate["above"],
          price: candidate["price"],
          enabled: candidate["enabled"],
        } satisfies Alert];
      });
      setAlertsState(next);
      saveLocalState("sc:alerts", next);
    }
    if (state.screeners) {
      const next = state.screeners.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const candidate = item as Record<string, unknown>;
        if (
          typeof candidate["id"] !== "string" ||
          typeof candidate["name"] !== "string" ||
          !candidate["filters"] ||
          typeof candidate["filters"] !== "object"
        ) return [];
        return [{
          id: candidate["id"],
          name: candidate["name"],
          filters: candidate["filters"] as ScreenerFilters,
          ...(candidate["marketId"] === "US" || candidate["marketId"] === "IN"
            ? { marketId: candidate["marketId"] }
            : {}),
          ...(candidate["assetClass"] === "equities" || candidate["assetClass"] === "etfs" || candidate["assetClass"] === "crypto" || candidate["assetClass"] === "forex"
            ? { assetClass: candidate["assetClass"] }
            : {}),
        } satisfies SavedScreener];
      });
      setAllScreeners(next);
      saveLocalState("sc:screeners", next);
    }
    if (state.refreshSeconds) {
      setRefreshState(state.refreshSeconds);
      saveLocalState("sc:refresh", state.refreshSeconds);
    }
    if (state.theme) {
      setThemeState(state.theme);
      saveLocalState("sc:theme", state.theme);
    }
    if (state.aiPreferences) {
      setApiKeysState((previous) => {
        const next = normalizeApiKeys({
          ...previous,
          ...(state.aiPreferences?.preferredModel
            ? { preferredModel: state.aiPreferences.preferredModel }
            : {}),
          ...(state.aiPreferences?.customModels ? { customModels: state.aiPreferences.customModels } : {}),
        });
        saveLocalState("sc:apikeys", next);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const auth = await cloudRequest<{ account: CloudAccount | null }>("/api/cloud/auth");
        if (cancelled) return;
        setCloudAccount(auth.account);
        if (!auth.account) {
          setCloudStatus("anonymous");
          return;
        }
        const cloud = await cloudRequest<{ state: CloudSyncState | null }>("/api/cloud/state");
        if (cancelled) return;
        if (cloud.state) applyCloudState(cloud.state);
        setCloudStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setCloudStatus("error");
        setCloudError(error instanceof Error ? error.message : "Cloud sync is unavailable.");
      } finally {
        if (!cancelled) setCloudReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyCloudState]);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("paper", theme === "paper");
    document.documentElement.classList.toggle("terminal", theme === "terminal");
    document.documentElement.classList.toggle("neuborder", theme === "neuborder");
  }, [theme]);

  useEffect(() => {
    const pending = allWatchlist
      .filter((w) => w.assetClass === "equities" && !w.sector)
      .map((w) => w.symbol);
    if (pending.length === 0) return;
    let cancelled = false;
    void classify({ data: { symbols: pending.join(",") } })
      .then((meta) => {
        if (cancelled || meta.length === 0) return;
        setAllWatchlist((prev) => {
          const next = prev.map((w) => {
            const m = meta.find((x) => x.symbol === w.symbol);
            if (!m) return w;
            return {
              ...w,
              name: m.name || w.name || w.symbol,
              sector: m.sector || "Uncategorised",
              industry: m.industry || "Other",
            };
          });
          saveLocalState("sc:watchlist2", next);
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [allWatchlist, classify]);

  const persistWatch = useCallback((next: WatchItem[]) => {
    setAllWatchlist(next);
    saveLocalState("sc:watchlist2", next);
  }, []);

  const signIntoCloud = useCallback(async (credentials: CloudCredentials) => {
    setCloudStatus("syncing");
    setCloudError(null);
    try {
      const auth = await cloudRequest<{ account: CloudAccount }>("/api/cloud/auth", {
        method: "POST",
        body: JSON.stringify({
          action: credentials.mode,
          email: credentials.email,
          password: credentials.password,
          ...(credentials.displayName ? { displayName: credentials.displayName } : {}),
        }),
      });
      setCloudAccount(auth.account);
      const cloud = await cloudRequest<{ state: CloudSyncState | null }>("/api/cloud/state");
      if (cloud.state) applyCloudState(cloud.state);
      setCloudReady(true);
      setCloudStatus("ready");
      return true;
    } catch (error) {
      setCloudStatus("error");
      setCloudError(error instanceof Error ? error.message : "Cloud sign-in failed.");
      return false;
    }
  }, [applyCloudState]);

  const signOutOfCloud = useCallback(async () => {
    try {
      await cloudRequest("/api/cloud/auth", {
        method: "POST",
        body: JSON.stringify({ action: "logout" }),
      });
    } finally {
      setCloudAccount(null);
      setCloudStatus("anonymous");
      setCloudError(null);
      setCloudReady(true);
    }
  }, []);

  const cloudSnapshot = useMemo(() => JSON.stringify({
    market,
    assetClass,
    watchlist: allWatchlist,
    alerts,
    screeners: allScreeners,
    refreshSeconds,
    theme,
    aiPreferences: {
      ...(apiKeys.preferredModel ? { preferredModel: apiKeys.preferredModel } : {}),
      ...(apiKeys.customModels ? { customModels: apiKeys.customModels } : {}),
    },
  } satisfies CloudSyncState), [
    alerts,
    allScreeners,
    allWatchlist,
    apiKeys.customModels,
    apiKeys.preferredModel,
    assetClass,
    market,
    refreshSeconds,
    theme,
  ]);

  useEffect(() => {
    if (!cloudReady || !cloudAccount) return;
    const timeout = window.setTimeout(() => {
      setCloudStatus("syncing");
      void cloudRequest("/api/cloud/state", {
        method: "PUT",
        body: JSON.stringify({ state: JSON.parse(cloudSnapshot) }),
      })
        .then(() => setCloudStatus("ready"))
        .catch((error) => {
          setCloudStatus("error");
          setCloudError(error instanceof Error ? error.message : "Cloud save failed.");
        });
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [cloudAccount, cloudReady, cloudSnapshot]);

  const value = useMemo<State>(() => {
    const scopedWatchlist = allWatchlist.filter(
      (w) => w.marketId === market && w.assetClass === assetClass,
    );
    const scopedScreeners = allScreeners.filter(
      (s) => (s.marketId ?? "US") === market && (s.assetClass ?? "equities") === assetClass,
    );
    const symbols = scopedWatchlist.map((w) => w.symbol);
    return {
      market,
      setMarket: (m) => {
        setMarketState(m);
        setAssetClassState("equities");
        saveLocalState("sc:market", m);
        saveLocalState("sc:asset-class", "equities");
      },
      assetClass,
      setAssetClass: (next) => {
        setAssetClassState(next);
        saveLocalState("sc:asset-class", next);
      },
      watchlist: scopedWatchlist,
      watchSymbols: symbols,
      isWatched: (s) => symbols.includes(s),
      addToWatchlist: (symbol, name) => {
        const normalized = symbol.toUpperCase();
        if (
          allWatchlist.some(
            (w) => w.symbol === normalized && w.marketId === market && w.assetClass === assetClass,
          )
        )
          return;
        persistWatch([
          ...allWatchlist,
          {
            symbol: normalized,
            name: name ?? normalized,
            sector: "",
            industry: "",
            marketId: market,
            assetClass,
          },
        ]);
      },
      removeFromWatchlist: (symbol) =>
        persistWatch(
          allWatchlist.filter(
            (w) => !(w.symbol === symbol && w.marketId === market && w.assetClass === assetClass),
          ),
        ),
      toggleWatchlist: (symbol, name) => {
        const normalized = symbol.toUpperCase();
        const exists = allWatchlist.some(
          (w) => w.symbol === normalized && w.marketId === market && w.assetClass === assetClass,
        );
        persistWatch(
          exists
            ? allWatchlist.filter(
                (w) =>
                  !(
                    w.symbol === normalized &&
                    w.marketId === market &&
                    w.assetClass === assetClass
                  ),
              )
            : [
                ...allWatchlist,
                {
                  symbol: normalized,
                  name: name ?? normalized,
                  sector: "",
                  industry: "",
                  marketId: market,
                  assetClass,
                },
              ],
        );
      },
      alerts,
      setAlerts: (a) => {
        setAlertsState(a);
        saveLocalState("sc:alerts", a);
      },
      screeners: scopedScreeners,
      saveScreener: (s) => {
        const nextScreener: SavedScreener = {
          ...s,
          marketId: s.marketId ?? market,
          assetClass: s.assetClass ?? assetClass,
        };
        const next = [...allScreeners.filter((x) => x.id !== s.id), nextScreener];
        setAllScreeners(next);
        saveLocalState("sc:screeners", next);
      },
      deleteScreener: (id) => {
        const next = allScreeners.filter((s) => s.id !== id);
        setAllScreeners(next);
        saveLocalState("sc:screeners", next);
      },
      apiKeys,
      setApiKeys: (k) => {
        setApiKeysState(k);
        saveLocalState("sc:apikeys", k);
      },
      cloudAccount,
      cloudStatus,
      cloudError,
      signIntoCloud,
      signOutOfCloud,
      refreshSeconds,
      setRefreshSeconds: (n) => {
        setRefreshState(n);
        saveLocalState("sc:refresh", n);
      },
      theme,
      setTheme: (next) => {
        setThemeState(next);
        saveLocalState("sc:theme", next);
      },
      aiPrefill,
      setAiPrefill: setAiPrefillState,
    };
  }, [
    market,
    assetClass,
    allWatchlist,
    alerts,
    allScreeners,
    apiKeys,
    cloudAccount,
    cloudError,
    cloudStatus,
    refreshSeconds,
    theme,
    aiPrefill,
    persistWatch,
    signIntoCloud,
    signOutOfCloud,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}

export function useMarketConfig() {
  const { market } = useAppState();
  return MARKETS[market];
}
