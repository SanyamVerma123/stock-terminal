import { describe, expect, it } from "vitest";
import {
  canonicalIndustryKey,
  providerTaxonomyLabel,
  taxonomyMatches,
} from "./sector-normalize";

describe("sector taxonomy normalization", () => {
  it("collapses the UI and provider aliases into one canonical industry key", () => {
    expect(canonicalIndustryKey("Internet Content & Information")).toBe("internet-content");
    expect(canonicalIndustryKey("Auto Manufacturers")).toBe("automobiles");
    expect(canonicalIndustryKey("Banks - Diversified")).toBe("banks");
    expect(canonicalIndustryKey("Beverages - Non-Alcoholic")).toBe("beverages");
    expect(canonicalIndustryKey("Household & Personal Products")).toBe("household-products");
  });

  it("uses provider-supported keys when requesting canonical industry groups", () => {
    expect(providerTaxonomyLabel("internet-content", "industry")).toBe(
      "internet-content-information",
    );
    expect(providerTaxonomyLabel("automobiles", "industry")).toBe("auto-manufacturers");
    expect(providerTaxonomyLabel("banks", "industry")).toBe("banks-diversified");
  });

  it("matches static fallback coverage against provider taxonomy names", () => {
    expect(taxonomyMatches("internet-content", "internet-content-information", "industry")).toBe(true);
    expect(taxonomyMatches("banks", "banks-regional", "industry")).toBe(true);
    expect(taxonomyMatches("automobiles", "auto-manufacturers", "industry")).toBe(true);
  });
});
