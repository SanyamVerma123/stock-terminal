import { describe, expect, it } from "vitest";
import { groupWatchlistByIndustry } from "./views";

describe("groupWatchlistByIndustry", () => {
  it("groups tracked symbols by available industry and leaves unknown companies in a final fallback group", () => {
    const groups = groupWatchlistByIndustry([
      { symbol: "MSFT", industry: "Software" },
      { symbol: "AAPL", industry: "Consumer Electronics" },
      { symbol: "ORCL", industry: "Software" },
      { symbol: "UNKNOWN", industry: null },
    ]);

    expect(groups.map((group) => group.industry)).toEqual([
      "Consumer Electronics",
      "Software",
      "Unclassified",
    ]);
    expect(groups[1]?.items.map((item) => item.symbol)).toEqual(["MSFT", "ORCL"]);
  });
});
