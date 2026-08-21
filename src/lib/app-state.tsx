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
export type Theme = "terminal" | "light" | "paper" | "neuborder" | "system";

export type WatchItem = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketId: MarketId;
  assetClass: AssetClass;
  folderId?: string;
};

export type Alert = { id: string; symbol: string; above: boolean; price: number; enabled: boolean };

export type WatchFolder = {
  id: string;
  name: string;
  color: "emerald" | "sky" | "violet" | "amber" | "rose";
};

export type ScreenerAlertRule = {
  id: string;
  screenerId: string;
  enabled: boolean;
  browserEnabled: boolean;
  emailEnabled: boolean;
  lastMatchKey?: string;
};

export type ScreenerNotification = {
  id: string;
  screenerId: string;
  screenerName: string;
  symbols: string[];
  createdAt: string;
  read: boolean;
};

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
  watchFolders: WatchFolder[];
  createWatchFolder: (name: string, color?: WatchFolder["color"]) => void;
  renameWatchFolder: (id: string, name: string) => void;
  reorderWatchFolder: (id: string, direction: "up" | "down") => void;
  deleteWatchFolder: (id: string) => void;
  moveWatchToFolder: (symbol: string, folderId?: string) => void;
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
  screenerAlertRules: ScreenerAlertRule[];
  setScreenerAlertRules: (rules: ScreenerAlertRule[]) => void;
  screenerNotifications: ScreenerNotification[];
  addScreenerNotification: (notification: ScreenerNotification) => void;
  markScreenerNotificationsRead: () => void;
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
  browserNotificationPermission: NotificationPermission | "unsupported";
  requestBrowserNotifications: () => Promise<NotificationPermission | "unsupported">;
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
        ...(typeof item["folderId"] === "string" ? { folderId: item["folderId"] } : {}),
      },
    ];
  });
}

function normalizeWatchFolders(raw: unknown): WatchFolder[] {
  if (!Array.isArray(raw)) return [];
  const colors: WatchFolder["color"][] = ["emerald", "sky", "violet", "amber", "rose"];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Record<string, unknown>;
    const id = typeof value["id"] === "string" ? value["id"] : "";
    const name = typeof value["name"] === "string" ? value["name"].trim().slice(0, 48) : "";
    const color = colors.includes(value["color"] as WatchFolder["color"])
      ? (value["color"] as WatchFolder["color"])
      : "emerald";
    return id && name ? [{ id, name, color }] : [];
  });
}

function normalizeScreenerAlertRules(raw: unknown): ScreenerAlertRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Record<string, unknown>;
    const id = typeof value["id"] === "string" ? value["id"] : "";
    const screenerId = typeof value["screenerId"] === "string" ? value["screenerId"] : "";
    if (!id || !screenerId) return [];
    return [{
      id,
      screenerId,
      enabled: value["enabled"] !== false,
      browserEnabled: value["browserEnabled"] !== false,
      emailEnabled: value["emailEnabled"] === true,
      ...(typeof value["lastMatchKey"] === "string" ? { lastMatchKey: value["lastMatchKey"] } : {}),
    } satisfies ScreenerAlertRule];
  });
}

function normalizeScreenerNotifications(raw: unknown): ScreenerNotification[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 500).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Record<string, unknown>;
    const id = typeof value["id"] === "string" ? value["id"] : "";
    const screenerId = typeof value["screenerId"] === "string" ? value["screenerId"] : "";
    const screenerName = typeof value["screenerName"] === "string" ? value["screenerName"] : "Saved screener";
    const createdAt = typeof value["createdAt"] === "string" ? value["createdAt"] : "";
    const symbols = Array.isArray(value["symbols"])
      ? value["symbols"].filter((symbol): symbol is string => typeof symbol === "string").slice(0, 50)
      : [];
    return id && screenerId && createdAt ? [{ id, screenerId, screenerName, symbols, createdAt, read: value["read"] === true }] : [];
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
  const [allWatchFolders, setAllWatchFolders] = useState<WatchFolder[]>([]);
  const [alerts, setAlertsState] = useState<Alert[]>([]);
  const [allScreeners, setAllScreeners] = useState<SavedScreener[]>([]);
  const [screenerAlertRules, setScreenerAlertRulesState] = useState<ScreenerAlertRule[]>([]);
  const [screenerNotifications, setScreenerNotificationsState] = useState<ScreenerNotification[]>([]);
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
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission | "unsupported">(
    () => (typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"),
  );
  const classify = useServerFn(classifySymbols);

  useEffect(() => {
    const storedMarket = loadLocalState<MarketId>("sc:market", "US");
    const storedAssetClass = loadLocalState<AssetClass>("sc:asset-class", "equities");
    setMarketState(storedMarket);
    setAssetClassState(storedMarket === "IN" ? "equities" : storedAssetClass);
    setAllWatchlist(normalizeWatchlist(loadLocalState<unknown>("sc:watchlist2", DEFAULT_WATCH)));
    setAllWatchFolders(normalizeWatchFolders(loadLocalState<unknown>("sc:watch-folders", [])));
    setAlertsState(loadLocalState<Alert[]>("sc:alerts", []));
    setAllScreeners(loadLocalState<SavedScreener[]>("sc:screeners", []));
    setScreenerAlertRulesState(normalizeScreenerAlertRules(loadLocalState<unknown>("sc:screener-alert-rules", [])));
    setScreenerNotificationsState(normalizeScreenerNotifications(loadLocalState<unknown>("sc:screener-notifications", [])));
    setApiKeysState(normalizeApiKeys(loadLocalState<unknown>("sc:apikeys", null)));
    setRefreshState(loadLocalState<number>("sc:refresh", 60));
    const storedTheme = loadLocalState<Theme>("sc:theme", "paper");
    setThemeState(
      (["terminal", "light", "paper", "neuborder", "system"] as Theme[]).includes(storedTheme)
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
    if (state.watchFolders) {
      const next = normalizeWatchFolders(state.watchFolders);
      setAllWatchFolders(next);
      saveLocalState("sc:watch-folders", next);
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
    if (state.screenerAlertRules) {
      const next = normalizeScreenerAlertRules(state.screenerAlertRules);
      setScreenerAlertRulesState(next);
      saveLocalState("sc:screener-alert-rules", next);
    }
    if (state.screenerNotifications) {
      const next = normalizeScreenerNotifications(state.screenerNotifications);
      setScreenerNotificationsState(next);
      saveLocalState("sc:screener-notifications", next);
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
    const appliedTheme = theme === "system" ? "paper" : theme;
    document.documentElement.dataset["theme"] = appliedTheme;
    document.documentElement.classList.toggle("light", appliedTheme === "light");
    document.documentElement.classList.toggle("paper", appliedTheme === "paper");
    document.documentElement.classList.toggle("terminal", appliedTheme === "terminal");
    document.documentElement.classList.toggle("neuborder", appliedTheme === "neuborder");
    document.documentElement.style.colorScheme = appliedTheme === "terminal" ? "dark" : "light";
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

  const requestBrowserNotifications = useCallback(async (): Promise<NotificationPermission | "unsupported"> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    const permission = await Notification.requestPermission();
    setBrowserNotificationPermission(permission);
    return permission;
  }, []);

  const cloudSnapshot = useMemo(() => JSON.stringify({
    market,
    assetClass,
    watchlist: allWatchlist,
    watchFolders: allWatchFolders,
    alerts,
    screeners: allScreeners,
    screenerAlertRules,
    screenerNotifications,
    refreshSeconds,
    theme,
    aiPreferences: {
      ...(apiKeys.preferredModel ? { preferredModel: apiKeys.preferredModel } : {}),
      ...(apiKeys.customModels ? { customModels: apiKeys.customModels } : {}),
    },
  } satisfies CloudSyncState), [
    alerts,
    allWatchFolders,
    allScreeners,
    allWatchlist,
    apiKeys.customModels,
    apiKeys.preferredModel,
    assetClass,
    market,
    refreshSeconds,
    screenerAlertRules,
    screenerNotifications,
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
      watchFolders: allWatchFolders,
      createWatchFolder: (name, color = "emerald") => {
        const trimmed = name.trim().slice(0, 48);
        if (!trimmed || allWatchFolders.some((folder) => folder.name.toLowerCase() === trimmed.toLowerCase())) return;
        const next = [...allWatchFolders, { id: crypto.randomUUID(), name: trimmed, color }];
        setAllWatchFolders(next);
        saveLocalState("sc:watch-folders", next);
      },
      renameWatchFolder: (id, name) => {
        const trimmed = name.trim().slice(0, 48);
        if (!trimmed) return;
        const next = allWatchFolders.map((folder) => folder.id === id ? { ...folder, name: trimmed } : folder);
        setAllWatchFolders(next);
        saveLocalState("sc:watch-folders", next);
      },
      reorderWatchFolder: (id, direction) => {
        const index = allWatchFolders.findIndex((folder) => folder.id === id);
        const target = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= allWatchFolders.length) return;
        const next = [...allWatchFolders];
        const [folder] = next.splice(index, 1);
        if (!folder) return;
        next.splice(target, 0, folder);
        setAllWatchFolders(next);
        saveLocalState("sc:watch-folders", next);
      },
      deleteWatchFolder: (id) => {
        const nextFolders = allWatchFolders.filter((folder) => folder.id !== id);
        const nextWatchlist = allWatchlist.map((item) => {
          if (item.folderId !== id) return item;
          const { folderId: _folderId, ...withoutFolder } = item;
          return withoutFolder;
        });
        setAllWatchFolders(nextFolders);
        setAllWatchlist(nextWatchlist);
        saveLocalState("sc:watch-folders", nextFolders);
        saveLocalState("sc:watchlist2", nextWatchlist);
      },
      moveWatchToFolder: (symbol, folderId) => {
        const next = allWatchlist.map((item) =>
          item.symbol !== symbol || item.marketId !== market || item.assetClass !== assetClass
            ? item
            : folderId
              ? { ...item, folderId }
              : (() => { const { folderId: _folderId, ...withoutFolder } = item; return withoutFolder; })(),
        );
        persistWatch(next);
      },
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
      screenerAlertRules,
      setScreenerAlertRules: (rules) => {
        const next = normalizeScreenerAlertRules(rules);
        setScreenerAlertRulesState(next);
        saveLocalState("sc:screener-alert-rules", next);
      },
      screenerNotifications,
      addScreenerNotification: (notification) => {
        setScreenerNotificationsState((previous) => {
          const next = [notification, ...previous.filter((item) => item.id !== notification.id)].slice(0, 500);
          saveLocalState("sc:screener-notifications", next);
          return next;
        });
      },
      markScreenerNotificationsRead: () => {
        const next = screenerNotifications.map((notification) => ({ ...notification, read: true }));
        setScreenerNotificationsState(next);
        saveLocalState("sc:screener-notifications", next);
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
      browserNotificationPermission,
      requestBrowserNotifications,
      aiPrefill,
      setAiPrefill: setAiPrefillState,
    };
  }, [
    market,
    assetClass,
    allWatchlist,
    allWatchFolders,
    alerts,
    allScreeners,
    screenerAlertRules,
    screenerNotifications,
    apiKeys,
    cloudAccount,
    cloudError,
    cloudStatus,
    refreshSeconds,
    theme,
    aiPrefill,
    browserNotificationPermission,
    persistWatch,
    requestBrowserNotifications,
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
