import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rootRoute = readFileSync(new URL("./__root.tsx", import.meta.url), "utf8");
const favicon = readFileSync(new URL("../../public/favicon.svg", import.meta.url), "utf8");
const manifest = readFileSync(new URL("../../public/site.webmanifest", import.meta.url), "utf8");

describe("external deployment branding", () => {
  it("uses the Insightful Search chart mark instead of the legacy Lovable favicon", () => {
    expect(rootRoute).toContain('href: "/favicon.svg"');
    expect(rootRoute).toContain('href: "/site.webmanifest"');
    expect(rootRoute).toContain("Insightful Search — Market Intelligence");
    expect(rootRoute).not.toContain('title: "Lovable App"');
    expect(favicon).toContain("viewBox=\"0 0 64 64\"");
    expect(favicon).toContain("#4ee0b6");
  });

  it("declares the same Insightful Search icon in the web manifest", () => {
    expect(manifest).toContain('"name": "Insightful Search"');
    expect(manifest).toContain('"src": "/favicon.svg"');
  });
});
