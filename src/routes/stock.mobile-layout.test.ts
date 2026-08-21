import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./stock.$symbol.tsx", import.meta.url), "utf8");
const mobileStyles = readFileSync(new URL("../stock-mobile.css", import.meta.url), "utf8");

describe("stock research mobile layout", () => {
  it("uses a native responsive layout instead of a page zoom toggle", () => {
    expect(pageSource).not.toContain("compactView");
    expect(pageSource).not.toContain("Zoom out");
    expect(pageSource).toContain('className="stock-research-main mx-auto max-w-7xl px-4 py-8 sm:px-6"');
  });

  it("keeps wide research data within named scroll regions with visible headers", () => {
    expect(pageSource).toContain('aria-label="Financial statement data"');
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
  });
});
