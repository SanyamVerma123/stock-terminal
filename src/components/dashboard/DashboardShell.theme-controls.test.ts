import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const headerSource = readFileSync(new URL("./DashboardShell.tsx", import.meta.url), "utf8");
const stateSource = readFileSync(new URL("../../lib/app-state.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const themeControlSource = readFileSync(new URL("../../theme-controls.css", import.meta.url), "utf8");

describe("dashboard header theme controls", () => {
  it("renders persisted White, Paper, and Black theme choices in the top-right header controls", () => {
    expect(headerSource).toContain("HeaderThemeSwitcher");
    expect(headerSource).toContain('value: "light"');
    expect(headerSource).toContain('value: "paper"');
    expect(headerSource).toContain('value: "terminal"');
    expect(headerSource).toContain('visibleLabel: "White"');
    expect(headerSource).toContain('visibleLabel: "Paper"');
    expect(headerSource).toContain('visibleLabel: "Black"');
    expect(headerSource).toContain("terminal-header-controls");
  });

  it("migrates legacy system preferences to Paper while retaining explicit White and Black mappings", () => {
    expect(stateSource).toContain('theme === "system" ? "paper" : theme');
    expect(stateSource).toContain('storedTheme === "system"');
    expect(stateSource).toContain('next === "system" ? "paper" : next');
    expect(stateSource).toContain('root.classList.add("theme-transitioning")');
    expect(stateSource).toContain("prefers-reduced-motion: reduce");
    expect(stateSource).not.toContain("prefers-color-scheme: dark");
    expect(stateSource).toContain("document.documentElement.style.colorScheme");
  });

  it("keeps separate token sets available for White, Paper, and Black appearances", () => {
    expect(styleSource).toContain(".light {");
    expect(styleSource).toContain(".paper {");
    expect(styleSource).toContain(".terminal {");
    expect(themeControlSource).toContain("html.theme-transitioning");
    expect(themeControlSource).toContain("prefers-reduced-motion:no-preference");
  });
});
