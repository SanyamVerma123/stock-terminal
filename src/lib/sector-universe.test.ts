import { describe, expect, it } from "vitest";
import { profilesForRegion } from "./sector-universe";

describe("representative sector coverage", () => {
  const india = profilesForRegion("in");

  it("offers multiple real India-listed companies for the thin sector fallbacks", () => {
    const count = (sector: string) => india.filter((profile) => profile.sector === sector).length;

    expect(count("healthcare")).toBeGreaterThanOrEqual(6);
    expect(count("technology")).toBeGreaterThanOrEqual(7);
    expect(count("utilities")).toBeGreaterThanOrEqual(4);
    expect(count("real-estate")).toBeGreaterThanOrEqual(4);
  });

  it("keeps the profile universe exchange-qualified for the India market", () => {
    expect(india.length).toBeGreaterThan(25);
    expect(india.every((profile) => profile.symbol.endsWith(".NS"))).toBe(true);
  });
});
