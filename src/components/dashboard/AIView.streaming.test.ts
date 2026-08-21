import { describe, expect, it } from "vitest";
import { isNearChatBottom } from "./AIView";

describe("AI analyst streaming scroll behavior", () => {
  it("follows a response only while the reader is already near the conversation end", () => {
    expect(isNearChatBottom(912, 400, 1400)).toBe(true);
    expect(isNearChatBottom(810, 400, 1400)).toBe(false);
  });

  it("allows the near-bottom threshold to be adjusted for compact mobile viewports", () => {
    expect(isNearChatBottom(870, 400, 1400, 140)).toBe(true);
  });
});
