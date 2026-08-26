import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const financeSource = readFileSync(new URL("./finance-data.server.ts", import.meta.url), "utf8");
const heatmapSource = readFileSync(
  new URL("../components/dashboard/SectorPerformanceHeatmap.tsx", import.meta.url),
  "utf8",
);

describe("sector coverage reconciliation", () => {
  it("uses a provider-ranked selected-sector fallback and classifies all returned constituents", () => {
    expect(financeSource).toContain("async function fetchProviderSectorRows");
    expect(financeSource).toContain("size: 50");
    expect(financeSource).toContain("enrichScreenerRows(returned)");
    expect(financeSource).toContain("fetchClassify(unresolved.map((row) => row.symbol), 50)");
    expect(financeSource).toContain("derived.industries.rows.length > providerIndustries.rows.length");
  });

  it("uses detailed coverage for sector-specific screeners and dashboard sector selection", () => {
    expect(financeSource).toContain('fetchSectorOverview(input.sector!, input.region ?? "US", { detailIndustryCoverage: true })');
    expect(heatmapSource).toContain('queryKey: ["sector-map-selected-detail", cfg.id, selectedSector]');
    expect(heatmapSource).toContain("detailIndustryCoverage: true");
  });
});
