import { describe, expect, it } from "vitest";
import { MOBILE_QUOTE_RAIL_COLUMNS } from "./QuoteTable";

describe("mobile quote detail rail", () => {
  it("retains all secondary quote metrics behind the compact two-column cards", () => {
    expect(MOBILE_QUOTE_RAIL_COLUMNS).toEqual(["Price", "Change", "Day range", "52W high", "Mkt cap"]);
  });
});
