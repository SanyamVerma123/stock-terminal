import { describe, expect, it } from "vitest";
import type { AnalystSummary, StockSummary } from "./finance-types";
import type { StatementTable } from "./finance-normalize";
import {
  extractStockSymbol,
  formatStockPageAnalystBrief,
  isStockAnalystRequest,
} from "./stock-analyst";

const summary: StockSummary = {
  quote: {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NMS",
    currency: "USD",
    price: 200,
    previousClose: 198,
    open: 199,
    dayHigh: 201,
    dayLow: 197,
    yearHigh: 250,
    yearLow: 150,
    marketCap: 3_000_000_000_000,
    change: 2,
    changePercent: 1,
  },
  ratios: {
    sector: "Technology",
    industry: "Consumer Electronics",
    country: "United States",
    summary: null,
    trailingPE: 28,
    forwardPE: 24,
    priceToBook: 35,
    enterpriseToEbitda: 20,
    profitMargins: 0.25,
    operatingMargins: 0.3,
    returnOnEquity: 1.2,
    revenueGrowth: 0.1,
    earningsGrowth: 0.12,
    debtToEquity: 80,
    dividendYield: 0.4,
    beta: 1.1,
    targetMeanPrice: 220,
    recommendationKey: "buy",
    numberOfAnalystOpinions: 40,
  },
};

const analyst: AnalystSummary = {
  distribution: [{ period: "0m", strongBuy: 12, buy: 18, hold: 8, sell: 1, strongSell: 1 }],
  targets: { current: 200, low: 180, mean: 220, median: 218, high: 250 },
  earningsHistory: [],
};

const financials: StatementTable = {
  columns: ["2025-09-30"],
  rows: [
    { label: "Total Revenue", values: [400_000_000_000] },
    { label: "Net Income", values: [100_000_000_000] },
  ],
};

describe("stock-page-backed analyst brief", () => {
  it("extracts explicit US and Indian tickers without mistaking common analyst terms for symbols", () => {
    expect(extractStockSymbol("Give me an analyst brief for $AAPL")).toBe("AAPL");
    expect(extractStockSymbol("Compare the outlook for RELIANCE.NS")).toBe("RELIANCE.NS");
    expect(extractStockSymbol("Can AI provide a valuation overview?")).toBeNull();
  });

  it("only activates the stock-backed flow for analyst-style questions", () => {
    expect(isStockAnalystRequest("What is the valuation and analyst target for AAPL?")).toBe(true);
    expect(isStockAnalystRequest("Write a short poem about AAPL")).toBe(false);
  });

  it("formats stock-page data into a complete grounded analyst brief", () => {
    const brief = formatStockPageAnalystBrief({
      symbol: "AAPL",
      summary,
      analyst,
      financials,
      news: [{ title: "Apple headline", publisher: "Example News", link: "https://example.com/apple", pubDate: null, summary: null }],
    });

    expect(brief).toContain("Apple Inc. (AAPL) — live analyst brief");
    expect(brief).toContain("$220.00 (+10.0% versus the current price)");
    expect(brief).toContain("30 positive, 8 hold, and 2 negative ratings");
    expect(brief).toContain("[Apple headline](https://example.com/apple)");
  });
});
