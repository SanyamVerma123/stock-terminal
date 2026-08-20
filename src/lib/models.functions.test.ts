import { describe, expect, it } from "vitest";
import {
  buildChatModelCatalog,
  FREE_ROUTER_MODEL,
  modelsForConfiguredProviders,
  type ChatModel,
} from "./models.functions";

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

  it("uses a saved fallback key to authenticate provider model discovery", async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const catalog = await buildChatModelCatalog(
      { kiloFallbackKey: "fallback-kilo-key" },
      async (url, init) => {
        const headers = new Headers(init?.headers);
        requests.push({ url, authorization: headers.get("Authorization") });
        return new Response(JSON.stringify({ data: [{ id: "provider/analyst", name: "Analyst" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    );

    expect(catalog.configuredProviders.kilo).toBe(true);
    expect(catalog.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "kilo:provider/analyst", provider: "kilo" }),
      ]),
    );
    expect(requests).toContainEqual({
      url: "https://api.kilo.ai/api/gateway/models",
      authorization: "Bearer fallback-kilo-key",
    });
  });
});
