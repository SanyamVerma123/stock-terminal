import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const headerSource = readFileSync(new URL("./DashboardShell.tsx", import.meta.url), "utf8");
const stateSource = readFileSync(new URL("../../lib/app-state.tsx", import.meta.url), "utf8");

describe("dashboard header theme controls", () => {
  it("renders the persisted system, light, and dark theme choices in the top-right header controls", () => {
    expect(headerSource).toContain("HeaderThemeSwitcher");
    expect(headerSource).toContain('value: "system"');
    expect(headerSource).toContain('value: "paper"');
    expect(headerSource).toContain('value: "terminal"');
    expect(headerSource).toContain('visibleLabel: "System"');
    expect(headerSource).toContain('visibleLabel: "Light"');
    expect(headerSource).toContain('visibleLabel: "Dark"');
    expect(headerSource).toContain("terminal-header-controls");
  });

  it("resolves system appearance from the browser preference and applies a matching color scheme", () => {
    expect(stateSource).toContain("prefers-color-scheme: dark");
    expect(stateSource).toContain('theme === "system" ? systemTheme : theme');
    expect(stateSource).toContain("document.documentElement.style.colorScheme");
    expect(stateSource).toContain('"system"');
  });
});
