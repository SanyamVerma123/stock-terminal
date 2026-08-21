import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stockMovementClass } from "@/lib/stock-movement";

const quoteTableSource = readFileSync(new URL("../components/dashboard/QuoteTable.tsx", import.meta.url), "utf8");
const tableSource = readFileSync(new URL("../components/dashboard/tables.tsx", import.meta.url), "utf8");
const viewSource = readFileSync(new URL("../components/dashboard/views.tsx", import.meta.url), "utf8");
const toolViewSource = readFileSync(new URL("../components/dashboard/tool-views.tsx", import.meta.url), "utf8");
const aiViewSource = readFileSync(new URL("../components/dashboard/AIView.tsx", import.meta.url), "utf8");
const stockRouteSource = readFileSync(new URL("../routes/stock.$symbol.tsx", import.meta.url), "utf8");
const appStateSource = readFileSync(new URL("./app-state.tsx", import.meta.url), "utf8");

describe("stock movement presentation", () => {
  it("classifies gains, losses, and unavailable moves without fabricating a direction", () => {
    expect(stockMovementClass(1.25)).toBe("stock-move-positive");
    expect(stockMovementClass(-0.75)).toBe("stock-move-negative");
    expect(stockMovementClass(0)).toBe("stock-move-neutral");
    expect(stockMovementClass(null)).toBe("stock-move-neutral");
  });

  it("applies the shared movement treatment to stock cards and table rows throughout the terminal", () => {
    expect(quoteTableSource).toContain("stockMovementClass(q.changePercent)");
    expect(tableSource).toContain("stockMovementClass(r.changePercent)");
    expect(viewSource).toContain("stock-move-row-positive");
    expect(toolViewSource).toContain("stockMovementClass(row.changePercent)");
    expect(toolViewSource).toContain("stockMovementClass(q.changePercent)");
    expect(aiViewSource).toContain("stock-move-row-positive");
    expect(stockRouteSource).toContain("stockMovementClass(peer.changePercent)");
  });

  it("enriches incomplete screener and sector card rows with provider quotes before applying their direction shade", () => {
    expect(tableSource).toContain("screener-card-live-quotes");
    expect(tableSource).toContain("stockMovementClass(quote.changePercent)");
    expect(toolViewSource).toContain("industry-live-quotes");
    expect(toolViewSource).toContain('quotes={sectorQuotes}');
    expect(toolViewSource).toContain('quotes={industryQuotes}');
  });

  it("does not cap the resolved industry signal deck at an arbitrary short list", () => {
    expect(toolViewSource).toContain("table.rows.map((row)");
    expect(toolViewSource).not.toContain("table.rows.slice(0, 8)");
  });

  it("makes System resolve to paper while preserving explicit Light and Dark options", () => {
    expect(appStateSource).toContain('theme === "system" ? "paper" : theme');
    expect(appStateSource).not.toContain("syncSystemTheme");
  });
});
