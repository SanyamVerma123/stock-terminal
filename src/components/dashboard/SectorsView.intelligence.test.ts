import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./tool-views.tsx", import.meta.url), "utf8");

describe("SectorsView intelligence workspace", () => {
  it("adds live breadth and size-versus-direction analysis to the dedicated sector page", () => {
    expect(source).toContain("SectorPulseVisual");
    expect(source).toContain("ScatterChart");
    expect(source).toContain("Market breadth");
    expect(source).toContain("Size vs. daily direction");
  });

  it("keeps industry composition and drilldown separate from the dashboard heat map", () => {
    expect(source).toContain("Sector intelligence lab");
    expect(source).toContain("IndustrySignalDeck");
    expect(source).toContain("Industry signals");
    expect(source).toContain("Industry composition");
  });
});
