import { describe, expect, it } from "vitest";
import { capitalizationTreemap, compactSectorLabel } from "./SectorPerformanceHeatmap";

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

  it("keeps a representative mix of weighted sectors in compact square-oriented tiles", () => {
    const rectangles = capitalizationTreemap([
      { key: "largest", value: 44 },
      { key: "large", value: 24 },
      { key: "medium", value: 12 },
      { key: "small-a", value: 8 },
      { key: "small-b", value: 5 },
      { key: "small-c", value: 4 },
      { key: "small-d", value: 3 },
    ]);
    const totalArea = rectangles.reduce((sum, rectangle) => sum + rectangle.width * rectangle.height, 0);
    const worstAspectRatio = Math.max(
      ...rectangles.map((rectangle) => Math.max(rectangle.width / rectangle.height, rectangle.height / rectangle.width)),
    );

    expect(totalArea).toBeCloseTo(10_000, 6);
    expect(worstAspectRatio).toBeLessThanOrEqual(4);
  });

  it("uses concise, recognizable labels for constrained phone tiles", () => {
    expect(compactSectorLabel("communication-services")).toBe("Comms");
    expect(compactSectorLabel("basic-materials")).toBe("Materials");
    expect(compactSectorLabel("technology")).toBe("Technology");
  });
});
