import { describe, expect, it } from "vitest";
import { sanitizeCloudSyncState } from "./cloud-types";

describe("cloud state sanitization", () => {
  it("retains supported terminal preferences while excluding API keys and unknown fields", () => {
    expect(
      sanitizeCloudSyncState({
        market: "IN",
        theme: "paper",
        watchlist: [{ symbol: "TCS.NS" }],
        watchFolders: [{ id: "core", name: "Core holdings", color: "emerald" }],
        screenerAlertRules: [{ id: "rule-1", screenerId: "screen-1", enabled: true }],
        screenerNotifications: [{ id: "notice-1", screenerId: "screen-1", createdAt: "2026-08-20T00:00:00.000Z" }],
        aiPreferences: { preferredModel: "opencode:zen/model", customModels: [] },
        openrouter: "must-not-be-saved",
        apiKeys: { openrouter: "must-not-be-saved" },
      }),
    ).toEqual({
      market: "IN",
        theme: "paper",
        watchlist: [{ symbol: "TCS.NS" }],
        watchFolders: [{ id: "core", name: "Core holdings", color: "emerald" }],
        screenerAlertRules: [{ id: "rule-1", screenerId: "screen-1", enabled: true }],
        screenerNotifications: [{ id: "notice-1", screenerId: "screen-1", createdAt: "2026-08-20T00:00:00.000Z" }],
        aiPreferences: { preferredModel: "opencode:zen/model", customModels: [] },
    });
  });
});
