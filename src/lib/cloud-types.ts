export type CloudSyncState = {
  market?: "US" | "IN";
  assetClass?: "equities" | "etfs" | "crypto" | "forex";
  watchlist?: unknown[];
  watchFolders?: unknown[];
  alerts?: unknown[];
  screeners?: unknown[];
  screenerAlertRules?: unknown[];
  screenerNotifications?: unknown[];
  refreshSeconds?: number;
  theme?: "terminal" | "light" | "paper" | "neuborder" | "system";
  aiPreferences?: {
    preferredModel?: string;
    customModels?: unknown[];
  };
  chatSessions?: unknown[];
  activeChatId?: string;
};

export type CloudAccount = {
  id: number;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
};

export function sanitizeCloudSyncState(input: unknown): CloudSyncState {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const value = input as Record<string, unknown>;
  const pickArray = (key: string, maximum: number) =>
    Array.isArray(value[key]) ? value[key]!.slice(0, maximum) : undefined;
  const market = value["market"] === "IN" ? "IN" : value["market"] === "US" ? "US" : undefined;
  const assetClass = ["equities", "etfs", "crypto", "forex"].includes(String(value["assetClass"]))
    ? (value["assetClass"] as CloudSyncState["assetClass"])
    : undefined;
  const theme = ["terminal", "light", "paper", "neuborder", "system"].includes(String(value["theme"]))
    ? (value["theme"] as CloudSyncState["theme"])
    : undefined;
  const refreshSeconds =
    typeof value["refreshSeconds"] === "number" && Number.isFinite(value["refreshSeconds"])
      ? Math.min(3_600, Math.max(15, Math.round(value["refreshSeconds"])))
      : undefined;
  const rawPreferences = value["aiPreferences"];
  const aiPreferences = rawPreferences && typeof rawPreferences === "object" && !Array.isArray(rawPreferences)
    ? {
        ...(typeof (rawPreferences as Record<string, unknown>)["preferredModel"] === "string"
          ? { preferredModel: (rawPreferences as Record<string, unknown>)["preferredModel"] as string }
          : {}),
        ...(Array.isArray((rawPreferences as Record<string, unknown>)["customModels"])
          ? { customModels: ((rawPreferences as Record<string, unknown>)["customModels"] as unknown[]).slice(0, 100) }
          : {}),
      }
    : undefined;
  const watchlist = pickArray("watchlist", 500);
  const watchFolders = pickArray("watchFolders", 100);
  const alerts = pickArray("alerts", 500);
  const screeners = pickArray("screeners", 250);
  const screenerAlertRules = pickArray("screenerAlertRules", 250);
  const screenerNotifications = pickArray("screenerNotifications", 500);
  const chatSessions = pickArray("chatSessions", 40);
  return {
    ...(market ? { market } : {}),
    ...(assetClass ? { assetClass } : {}),
    ...(watchlist ? { watchlist } : {}),
    ...(watchFolders ? { watchFolders } : {}),
    ...(alerts ? { alerts } : {}),
    ...(screeners ? { screeners } : {}),
    ...(screenerAlertRules ? { screenerAlertRules } : {}),
    ...(screenerNotifications ? { screenerNotifications } : {}),
    ...(refreshSeconds ? { refreshSeconds } : {}),
    ...(theme ? { theme } : {}),
    ...(aiPreferences && Object.keys(aiPreferences).length ? { aiPreferences } : {}),
    ...(chatSessions ? { chatSessions } : {}),
    ...(typeof value["activeChatId"] === "string" ? { activeChatId: value["activeChatId"] } : {}),
  };
}
