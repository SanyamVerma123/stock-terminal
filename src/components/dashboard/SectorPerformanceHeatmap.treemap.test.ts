import { describe, expect, it } from "vitest";
import { capitalizationTreemap } from "./SectorPerformanceHeatmap";

describe("capitalizationTreemap", () => {
  it("allocates tile area in direct proportion to supplied market capitalization", () => {
    const rectangles = capitalizationTreemap([
      { key: "large", value: 600 },
      { key: "mid", value: 300 },
      { key: "small", value: 100 },
    ]);
    const areaByKey = new Map(rectangles.map((rectangle) => [rectangle.key, rectangle.width * rectangle.height]));

    expect(areaByKey.get("large")).toBeCloseTo(6000, 6);
    expect(areaByKey.get("mid")).toBeCloseTo(3000, 6);
    expect(areaByKey.get("small")).toBeCloseTo(1000, 6);
  });
});
