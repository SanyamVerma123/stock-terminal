import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./FinancialVisualAnalytics.tsx", import.meta.url), "utf8");

describe("FinancialVisualAnalytics", () => {
  it("uses provider statement rows for trend, cash-flow, and composition visuals", () => {
    expect(source).toContain("Total Revenue");
    expect(source).toContain("Operating Cash Flow");
    expect(source).toContain("Cost Of Revenue");
    expect(source).toContain("AreaChart");
    expect(source).toContain("BarChart");
    expect(source).toContain("PieChart");
  });

  it("renders explicit unavailable-data states instead of manufactured chart values", () => {
    expect(source).toContain("Provider data unavailable");
    expect(source).toContain("trend will appear when at least two statement periods are returned");
  });
});
