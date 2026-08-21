import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./stock.$symbol.tsx", import.meta.url), "utf8");
const mobileStyles = readFileSync(new URL("../stock-mobile.css", import.meta.url), "utf8");
const fundamentalsStyles = readFileSync(new URL("../fundamentals.css", import.meta.url), "utf8");

describe("stock research mobile layout", () => {
  it("uses a native responsive layout instead of a page zoom toggle", () => {
    expect(pageSource).not.toContain("compactView");
    expect(pageSource).not.toContain("Zoom out");
    expect(pageSource).toContain('className="stock-research-main mx-auto max-w-7xl px-4 py-8 sm:px-6"');
  });

  it("keeps wide research data within named scroll regions with visible headers", () => {
    expect(pageSource).toContain('aria-label={`${title} data`}');
    expect(pageSource).toContain('aria-label="Analyst rating changes"');
    expect(pageSource).toContain(">Line item</th>");
    expect(pageSource).toContain(">Date</th>");
    expect(pageSource).toContain("stock-data-row-label sticky left-0");
  });

  it("contains table overflow and keeps the chart responsive at phone widths", () => {
    expect(mobileStyles).toContain("overflow-x: auto");
    expect(mobileStyles).toContain("-webkit-overflow-scrolling: touch");
    expect(mobileStyles).toContain(".stock-research-main");
    expect(mobileStyles).toContain(".stock-price-chart .recharts-responsive-container");
  });

  it("uses a structured Screener-inspired fundamentals snapshot above detailed statements", () => {
    expect(pageSource).toContain("fundamentals-grid");
    expect(pageSource).toContain('label="Market cap"');
    expect(pageSource).toContain('label="52W high / low"');
    expect(pageSource).toContain('label="Return on equity"');
    expect(pageSource).toContain("fundamentals-statement-context");
    expect(pageSource).toContain("FinancialStatementSection");
  });

  it("renders all three financial statements with persistent navigation and live data queries", () => {
    expect(pageSource).toContain('id="profit-loss"');
    expect(pageSource).toContain('id="balance-sheet"');
    expect(pageSource).toContain('id="cash-flow"');
    expect(pageSource).toContain("incomeFinancials");
    expect(pageSource).toContain("balanceFinancials");
    expect(pageSource).toContain("cashFinancials");
    expect(pageSource).toContain("financial-analysis-nav");
    expect(pageSource).not.toContain("setStatement");
    expect(fundamentalsStyles).toContain(".financial-analysis-nav");
    expect(fundamentalsStyles).toContain(".financial-frequency-toggle");
  });
});
