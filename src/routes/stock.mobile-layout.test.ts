import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./stock.$symbol.tsx", import.meta.url), "utf8");
const mobileStyles = readFileSync(new URL("../stock-mobile.css", import.meta.url), "utf8");
const fundamentalsStyles = readFileSync(new URL("../fundamentals.css", import.meta.url), "utf8");
const hierarchySource = readFileSync(new URL("../lib/statement-hierarchy.ts", import.meta.url), "utf8");

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
    expect(mobileStyles).toContain(".stock-research-shell,");
    expect(mobileStyles).toContain("overflow-x: clip");
    expect(mobileStyles).toContain("margin-right: 0 !important");
    expect(mobileStyles).toContain(".financial-statement-tabs");
    expect(fundamentalsStyles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });

  it("uses a structured Screener-inspired fundamentals snapshot above detailed statements", () => {
    expect(pageSource).toContain("fundamentals-grid");
    expect(pageSource).toContain('label="Market cap"');
    expect(pageSource).toContain('label="52W high / low"');
    expect(pageSource).toContain('label="Return on equity"');
    expect(pageSource).toContain("fundamentals-statement-context");
    expect(pageSource).toContain("FinancialStatementTable");
  });

  it("switches one focused financial table between all three statements", () => {
    expect(pageSource).toContain("const [financialPreference, setFinancialPreference]");
    expect(pageSource).toContain('role="tablist"');
    expect(pageSource).toContain('aria-selected={statement === key}');
    expect(pageSource).toContain("activeStatement");
    expect(pageSource).toContain("incomeFinancials");
    expect(pageSource).toContain("balanceFinancials");
    expect(pageSource).toContain("cashFinancials");
    expect(pageSource).toContain('statement === "income" &&');
    expect(pageSource).toContain('statement: "balance", quarterly: false');
    expect(pageSource).toContain('statement: "cash", quarterly: false');
    expect(fundamentalsStyles).toContain(".financial-statement-tabs");
    expect(fundamentalsStyles).toContain(".financial-period-toggle");
  });

  it("offers live-data growth cards, expandable period breakdowns, and stored financial-view preferences", () => {
    expect(pageSource).toContain("ProfitLossGrowthSummary");
    expect(pageSource).toContain("Revenue growth");
    expect(pageSource).toContain("Operating income growth");
    expect(pageSource).toContain("Net income growth");
    expect(pageSource).toContain("financial-line-expand");
    expect(pageSource).toContain("aria-expanded={expanded}");
    expect(pageSource).toContain("buildStatementHierarchy");
    expect(hierarchySource).toContain("MAJOR_ACCOUNT_GROUPS");
    expect(pageSource).toContain("financial-child-row");
    expect(pageSource).toContain("financial-child-label");
    expect(pageSource).toContain("FINANCIAL_VIEW_PREFERENCE_KEY");
    expect(pageSource).toContain('window.localStorage.setItem(FINANCIAL_VIEW_PREFERENCE_KEY');
    expect(fundamentalsStyles).toContain(".profit-loss-growth-summary");
    expect(fundamentalsStyles).toContain(".financial-line-detail");
    expect(fundamentalsStyles).toContain(".financial-child-row");
  });
});
