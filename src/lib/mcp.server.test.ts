import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./mcp.server.ts", import.meta.url), "utf8");

describe("market-data MCP transport safeguards", () => {
  it("shares matching in-flight requests and briefly reuses stable market responses", () => {
    expect(source).toContain("const pendingToolCalls = new Map<string, Promise<unknown>>()");
    expect(source).toContain("const toolResultCache = new Map<string, CachedToolResult>()");
    expect(source).toContain("if (inFlight) return inFlight as Promise<T>");
    expect(source).toContain('get_price_snapshot: 15_000');
    expect(source).toContain('screen_equities: 20_000');
    expect(source).toContain('get_sector_overview: 120_000');
  });
});
