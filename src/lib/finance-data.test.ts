import { describe, expect, it } from "vitest";
import {
  deriveIndustryCoverageFromClassifications,
  filterMarketCalendar,
  overviewTableToScreenerRows,
  rankPredefinedScreenerRows,
  resolveSectorOverviewTables,
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

describe("sector overview fallback resolution", () => {
  it("uses available tracked Industrial coverage when an incomplete provider overview would otherwise keep the sector unresolved", () => {
    const fallback = {
      topCompanies: { columns: ["Symbol"], rows: [{ Symbol: "CAT" }] },
      industries: {
        columns: ["Industry"],
        rows: [{ Industry: "Farm & Heavy Construction Machinery" }],
      },
    };
    const resolved = resolveSectorOverviewTables(
      { columns: [], rows: [] },
      { columns: ["Industry"], rows: [{ Industry: "Aerospace & Defense" }] },
      fallback,
    );

    expect(resolved.needsFallback).toBe(true);
    expect(resolved.topCompanies.rows).toEqual([{ Symbol: "CAT" }]);
    expect(resolved.industries.rows).toEqual([{ Industry: "Aerospace & Defense" }]);
  });
});

describe("derived sector industry coverage", () => {
  it("reconstructs India industry composition from provider-ranked companies when the provider omits its industries array", () => {
    const derived = deriveIndustryCoverageFromClassifications(
      {
        columns: ["symbol", "market weight"],
        rows: [
          { symbol: "LT.NS", "market weight": "0.08" },
          { symbol: "ADANIPORTS.BO", "market weight": "0.06" },
          { symbol: "HAL.BO", "market weight": "0.05" },
          { symbol: "BEL.NS", "market weight": "0.04" },
        ],
      },
      [
        { symbol: "LT.NS", name: "Larsen & Toubro", sector: "industrials", industry: "engineering-construction", currency: "INR" },
        { symbol: "ADANIPORTS.BO", name: "Adani Ports", sector: "industrials", industry: "marine-shipping", currency: "INR" },
        { symbol: "HAL.BO", name: "Hindustan Aeronautics", sector: "industrials", industry: "aerospace-defense", currency: "INR" },
        { symbol: "BEL.NS", name: "Bharat Electronics", sector: "industrials", industry: "aerospace-defense", currency: "INR" },
      ],
    );

    expect(derived.topCompanies.rows).toHaveLength(4);
    expect(derived.industries.rows).toHaveLength(3);
    expect(derived.industries.rows[0]).toMatchObject({ Industry: "aerospace-defense", Companies: "2" });
    expect(derived.topCompanies.rows[1]).toMatchObject({ Name: "Adani Ports", Industry: "marine-shipping" });
  });

  it("retains all provider-ranked constituents and every classified industry in a full sector detail result", () => {
    const industries = Array.from({ length: 15 }, (_, index) => `industrial-group-${index + 1}`);
    const symbols = Array.from({ length: 50 }, (_, index) => `IND${index + 1}.NS`);
    const derived = deriveIndustryCoverageFromClassifications(
      {
        columns: ["Symbol", "Market Weight"],
        rows: symbols.map((symbol, index) => ({
          Symbol: symbol,
          "Market Weight": `${0.01 + index / 10_000}`,
        })),
      },
      symbols.map((symbol, index) => ({
        symbol,
        name: `Industrial Company ${index + 1}`,
        sector: "industrials",
        industry: industries[index % industries.length]!,
        currency: "INR",
      })),
    );

    expect(derived.topCompanies.rows).toHaveLength(50);
    expect(derived.industries.rows).toHaveLength(15);
    expect(derived.industries.rows.reduce((count, row) => count + Number(row.Companies), 0)).toBe(50);
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
