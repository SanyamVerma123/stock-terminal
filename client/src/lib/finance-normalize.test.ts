import { describe, expect, it } from "vitest";
import { normalizeCurrency, normalizeNullableNumber, normalizePercent } from "./finance-normalize";

describe("finance normalization helpers", () => {
  it("normalizes currency codes with a safe USD fallback", () => {
    expect(normalizeCurrency(" inr ")).toBe("INR");
    expect(normalizeCurrency(" ")).toBe("USD");
  });

  it("preserves only finite numerical values", () => {
    expect(normalizeNullableNumber(42.5)).toBe(42.5);
    expect(normalizeNullableNumber(Number.NaN)).toBeNull();
    expect(normalizeNullableNumber("42.5")).toBe(42.5);
  });

  it("converts fractional values to display percentages when requested", () => {
    expect(normalizePercent(0.125, true)).toBe(12.5);
    expect(normalizePercent(null, true)).toBeNull();
  });
});
