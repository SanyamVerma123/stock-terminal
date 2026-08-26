import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./tool-views.tsx", import.meta.url), "utf8");

describe("dashboard data-loading policies", () => {
  it("keeps current screener and mover results visible while using a measured refresh cadence", () => {
    expect(source).toContain('staleTime: 20_000');
    expect(source).toContain('refetchOnWindowFocus: false');
    expect(source).toContain('refetchInterval: 60_000');
    expect(source).toContain('loading={isLoading && !data}');
    expect(source).toContain('setAppliedFilters({ ...f })');
  });

  it("reduces sector-overview polling while preserving live quote refreshes", () => {
    expect(source).toContain('refetchInterval: 120_000');
    expect(source).toContain('queryKey: ["sector", sector, cfg.id, "detail-industry-coverage-v2"]');
    expect(source).toContain('queryKey: ["sector-live-quotes", cfg.id, sectorSymbols.join(",")]');
  });
});
