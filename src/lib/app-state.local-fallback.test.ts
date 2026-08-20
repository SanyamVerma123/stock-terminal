import { afterEach, describe, expect, it } from "vitest";
import { loadLocalState, saveLocalState } from "./app-state";

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

describe("local terminal-state fallback", () => {
  it("restores browser-local data even when no cloud session is present", () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
        },
      },
    });

    saveLocalState("sc:watchlist", [{ symbol: "TCS.NS" }]);
    expect(loadLocalState("sc:watchlist", [])).toEqual([{ symbol: "TCS.NS" }]);
    expect(loadLocalState("sc:cloud-missing", "local-only")).toBe("local-only");
  });
});
