import { describe, expect, it } from "vitest";
import {
  savedScreenerFromToolResult,
  screenerToolResultFromPart,
} from "./AIView";

describe("AI screener preset handoff", () => {
  it("turns a create_screener tool result into a reusable preset and matching table rows", () => {
    const result = screenerToolResultFromPart(
      {
        type: "tool-create_screener",
        toolCallId: "screen-1",
        output: {
          type: "screener_result",
          name: "India quality value",
          criteria: "India companies with P/E below 20",
          filters: { region: "in", sector: "Technology", size: 25, sortField: "intradaymarketcap", sortAscending: false },
          rows: [{ symbol: "TCS.NS", name: "Tata Consultancy Services", price: 2890, peRatio: 19.5 }],
        },
      },
      "fallback-id",
    );

    expect(result).not.toBeNull();
    expect(result?.rows).toEqual([
      { symbol: "TCS.NS", name: "Tata Consultancy Services", price: 2890, peRatio: 19.5 },
    ]);
    expect(savedScreenerFromToolResult(result!)).toEqual({
      id: "ai-screen-1",
      name: "India quality value",
      filters: expect.objectContaining({ region: "in", sector: "Technology", size: 25 }),
    });
  });
});
