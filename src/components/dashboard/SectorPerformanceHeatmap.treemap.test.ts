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

  it("uses compact square-oriented strips for a representative sector mix", () => {
    const rectangles = capitalizationTreemap([
      { key: "largest", value: 44 },
      { key: "large", value: 24 },
      { key: "medium", value: 12 },
      { key: "small-a", value: 8 },
      { key: "small-b", value: 5 },
      { key: "small-c", value: 4 },
      { key: "small-d", value: 3 },
    ]);
    const worstAspect = Math.max(
      ...rectangles.map((rectangle) => Math.max(rectangle.width / rectangle.height, rectangle.height / rectangle.width)),
    );
    const totalArea = rectangles.reduce((sum, rectangle) => sum + rectangle.width * rectangle.height, 0);

    expect(totalArea).toBeCloseTo(10_000, 6);
    expect(worstAspect).toBeLessThanOrEqual(4);
  });
});
