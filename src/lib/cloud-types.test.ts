import { describe, expect, it } from "vitest";
import { sanitizeCloudSyncState } from "./cloud-types";

describe("cloud state sanitization", () => {
  it("retains supported terminal preferences while excluding API keys and unknown fields", () => {
    expect(
      sanitizeCloudSyncState({
        market: "IN",
        theme: "paper",
        watchlist: [{ symbol: "TCS.NS" }],
        aiPreferences: { preferredModel: "opencode:zen/model", customModels: [] },
        openrouter: "must-not-be-saved",
        apiKeys: { openrouter: "must-not-be-saved" },
      }),
    ).toEqual({
      market: "IN",
      theme: "paper",
      watchlist: [{ symbol: "TCS.NS" }],
      aiPreferences: { preferredModel: "opencode:zen/model", customModels: [] },
    });
  });
});
