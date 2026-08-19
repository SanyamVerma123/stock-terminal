import { describe, expect, it } from "vitest";
import { FREE_ROUTER_MODEL, modelsForConfiguredProviders, type ChatModel } from "./models.functions";

describe("AI model defaults", () => {
  it("uses the OpenRouter free router as the zero-cost Analyst default", () => {
    expect(FREE_ROUTER_MODEL).toBe("openrouter:openrouter/free");
  });

  it("exposes models only from providers with a configured key", () => {
    const models: ChatModel[] = [
      { id: "openrouter:openrouter/free", label: "Free", provider: "openrouter" },
      { id: "kilo:provider/model", label: "Kilo", provider: "kilo" },
    ];
    const configured = {
      openrouter: true,
      kilo: false,
      groq: false,
      together: false,
      deepseek: false,
      opencode: false,
    } as const;

    expect(modelsForConfiguredProviders(models, configured)).toEqual([models[0]]);
  });
});
