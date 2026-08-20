import { describe, expect, it } from "vitest";
import {
  filterMarketCalendar,
  overviewTableToScreenerRows,
  rankPredefinedScreenerRows,
} from "./finance-data.server";

describe("provider overview screener conversion", () => {
  it("keeps all returned industry overview rows available to the Pro Screener", () => {
    const table = {
      columns: ["Symbol", "Name", "Sector", "Industry", "Price"],
      rows: Array.from({ length: 50 }, (_, index) => ({
        Symbol: `TEST${index + 1}.NS`,
        Name: `Test Company ${index + 1}`,
        Sector: "Healthcare",
        Industry: "Drug Manufacturers - General",
        Price: "1,250.50",
      })),
    };

    const rows = overviewTableToScreenerRows(table, {
      region: "in",
      sector: "healthcare",
      industry: "drug-manufacturers-general",
      size: 50,
    });

    expect(rows).toHaveLength(50);
    expect(rows.every((row) => row.symbol.endsWith(".NS"))).toBe(true);
    expect(rows[0]).toMatchObject({
      symbol: "TEST1.NS",
      price: 1250.5,
      sector: "healthcare",
      industry: "pharmaceuticals",
    });
  });
});

describe("economic event filters", () => {
  it("keeps only the selected region and calendar date when the provider returns a global feed", () => {
    const filtered = filterMarketCalendar({
      columns: ["Event", "Region", "Event Time"],
      rows: [
        { Event: "India CPI", Region: "IN", "Event Time": "2026-08-20T04:00:00+00:00" },
        { Event: "India GDP", Region: "IN", "Event Time": "2026-08-21T04:00:00+00:00" },
        { Event: "US GDP", Region: "US", "Event Time": "2026-08-20T12:30:00+00:00" },
      ],
    }, { region: "IN", date: "2026-08-20", limit: 40 });

    expect(filtered.rows).toEqual([
      { Event: "India CPI", Region: "IN", "Event Time": "2026-08-20T04:00:00+00:00" },
    ]);
  });
});

describe("primary mover preset ranking", () => {
  const rows = [
    { symbol: "UP", name: "Up Co", price: 20, changePercent: 7.2, marketCap: 100, volume: 125, peRatio: null, exchange: "NMS", sector: null, currency: "USD", rating: null },
    { symbol: "DOWN", name: "Down Co", price: 12, changePercent: -5.4, marketCap: 100, volume: 400, peRatio: null, exchange: "NMS", sector: null, currency: "USD", rating: null },
    { symbol: "BUSY", name: "Busy Co", price: 15, changePercent: 1.1, marketCap: 100, volume: 900, peRatio: null, exchange: "NMS", sector: null, currency: "USD", rating: null },
    { symbol: "UP", name: "Up Co duplicate", price: 20, changePercent: 7.2, marketCap: 100, volume: 125, peRatio: null, exchange: "NMS", sector: null, currency: "USD", rating: null },
  ];

  it("returns distinct, preset-specific orders for gainers, losers, and most active", () => {
    expect(rankPredefinedScreenerRows("day_gainers", rows, 3).map((row) => row.symbol)).toEqual(["UP", "BUSY", "DOWN"]);
    expect(rankPredefinedScreenerRows("day_losers", rows, 3).map((row) => row.symbol)).toEqual(["DOWN", "BUSY", "UP"]);
    expect(rankPredefinedScreenerRows("most_actives", rows, 3).map((row) => row.symbol)).toEqual(["BUSY", "DOWN", "UP"]);
  });
});
