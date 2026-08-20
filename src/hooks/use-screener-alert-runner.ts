import { useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runEquityScreener } from "@/lib/finance.functions";
import { useAppState, type ScreenerFilters } from "@/lib/app-state";

function paramsFor(filters: ScreenerFilters) {
  const out: Record<string, string | number | boolean> = {
    region: filters.region,
    size: Math.min(filters.size, 50),
    sortField: filters.sortField,
    sortAscending: filters.sortAscending,
  };
  const strings: Array<[string, string | undefined]> = [
    ["sector", filters.sector], ["industry", filters.industry], ["exchange", filters.exchange], ["nameContains", filters.nameContains],
  ];
  const numbers: Array<[string, string]> = [
    ["minMarketCap", filters.minMarketCap], ["maxMarketCap", filters.maxMarketCap], ["minPe", filters.minPe], ["maxPe", filters.maxPe],
    ["minGrowth", filters.minGrowth], ["minDividendYield", filters.minDividendYield], ["minPrice", filters.minPrice], ["maxPrice", filters.maxPrice],
    ["minVolume", filters.minVolume], ["minChangePercent", filters.minChangePercent], ["maxChangePercent", filters.maxChangePercent],
  ];
  for (const [key, value] of strings) if (value?.trim()) out[key] = value.trim();
  for (const [key, value] of numbers) if (value.trim() && Number.isFinite(Number(value))) out[key] = Number(value);
  return out as Parameters<typeof runEquityScreener>[0]["data"];
}

/** Checks enabled screeners on mount and whenever the active terminal tab regains focus. */
export function useScreenerAlertRunner() {
  const run = useServerFn(runEquityScreener);
  const {
    screeners,
    screenerAlertRules,
    setScreenerAlertRules,
    addScreenerNotification,
    browserNotificationPermission,
  } = useAppState();
  const running = useRef(false);

  const check = useCallback(async () => {
    if (running.current) return;
    const activeRules = screenerAlertRules.filter((rule) => rule.enabled);
    if (activeRules.length === 0) return;
    running.current = true;
    try {
      const nextRules = [...screenerAlertRules];
      let changed = false;
      for (const rule of activeRules) {
        const screener = screeners.find((item) => item.id === rule.screenerId);
        if (!screener) continue;
        try {
          const rows = await run({ data: paramsFor(screener.filters) });
          const symbols = rows.map((row) => row.symbol).filter(Boolean).slice(0, 25);
          const matchKey = symbols.join(",");
          const index = nextRules.findIndex((item) => item.id === rule.id);
          if (index < 0) continue;
          if (rule.lastMatchKey && rule.lastMatchKey !== matchKey && symbols.length > 0) {
            const notification = {
              id: crypto.randomUUID(),
              screenerId: screener.id,
              screenerName: screener.name,
              symbols: symbols.slice(0, 8),
              createdAt: new Date().toISOString(),
              read: false,
            };
            addScreenerNotification(notification);
            if (rule.browserEnabled && browserNotificationPermission === "granted") {
              new Notification(`Screener match: ${screener.name}`, {
                body: `${symbols.slice(0, 4).join(", ")}${symbols.length > 4 ? ` +${symbols.length - 4} more` : ""}`,
                tag: `screener-${screener.id}`,
              });
            }
          }
          if (nextRules[index]!.lastMatchKey !== matchKey) {
            nextRules[index] = { ...nextRules[index]!, lastMatchKey: matchKey };
            changed = true;
          }
        } catch {
          // A later active-session check retries transient data-provider failures.
        }
      }
      if (changed) setScreenerAlertRules(nextRules);
    } finally {
      running.current = false;
    }
  }, [addScreenerNotification, browserNotificationPermission, run, screeners, screenerAlertRules, setScreenerAlertRules]);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [check]);
}
