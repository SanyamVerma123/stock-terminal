import { createServerFn } from "@tanstack/react-start";

export type ChatProvider = "openrouter" | "kilo" | "groq" | "together" | "deepseek" | "opencode";

export type ChatModel = {
  id: string;
  label: string;
  provider: ChatProvider;
  note?: string;
};

type OpenRouterModel = { id?: string; name?: string };

export type CatalogInput = {
  openrouterKey?: string;
  openrouterFallbackKey?: string;
  kiloKey?: string;
  kiloFallbackKey?: string;
  groqKey?: string;
  groqFallbackKey?: string;
  togetherKey?: string;
  togetherFallbackKey?: string;
  deepseekKey?: string;
  deepseekFallbackKey?: string;
  opencodeKey?: string;
  opencodeFallbackKey?: string;
};

export const FREE_ROUTER_MODEL = "openrouter:openrouter/free";

export function modelsForConfiguredProviders(
  models: ChatModel[],
  configuredProviders: Record<ChatProvider, boolean>,
) {
  return models.filter((model) => configuredProviders[model.provider]);
}

const CURATED_MODELS: ChatModel[] = [
  {
    id: FREE_ROUTER_MODEL,
    label: "OpenRouter Free",
    provider: "openrouter",
    note: "Free router",
  },
  {
    id: "openrouter:openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "openrouter",
    note: "Fast",
  },
  {
    id: "kilo:anthropic/claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    provider: "kilo",
    note: "Deep research",
  },
  {
    id: "kilo:nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron 3 Ultra · Free · 550B",
    provider: "kilo",
    note: "Free",
  },
  {
    id: "groq:llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    provider: "groq",
    note: "Fast open model",
  },
  {
    id: "together:meta-llama/Llama-3.3-70B-Instruct-Turbo",
    label: "Llama 3.3 70B Turbo",
    provider: "together",
    note: "Balanced",
  },
  { id: "deepseek:deepseek-chat", label: "DeepSeek Chat", provider: "deepseek", note: "General" },
  {
    id: "deepseek:deepseek-reasoner",
    label: "DeepSeek Reasoner",
    provider: "deepseek",
    note: "Reasoning",
  },
  { id: "opencode:big-pickle", label: "Big Pickle · Zen", provider: "opencode", note: "General" },
];

function keyAvailable(value: string | undefined, envName: string) {
  return Boolean(value?.trim() || process.env[envName]);
}

function resolvedKey(primary: string | undefined, fallback: string | undefined, envName: string) {
  return primary?.trim() || fallback?.trim() || process.env[envName];
}

type ModelFetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Build a safe, provider-labelled model catalog. Provider secrets never leave this server function. */
export async function buildChatModelCatalog(
  data: CatalogInput,
  fetchModels: ModelFetch = (input, init) => fetch(input, init),
) {
  const providerKeys = {
    openrouter: resolvedKey(data.openrouterKey, data.openrouterFallbackKey, "OPENROUTER_API_KEY"),
    kilo: resolvedKey(data.kiloKey, data.kiloFallbackKey, "KILO_API_KEY"),
    groq: resolvedKey(data.groqKey, data.groqFallbackKey, "GROQ_API_KEY"),
    together: resolvedKey(data.togetherKey, data.togetherFallbackKey, "TOGETHER_API_KEY"),
    deepseek: resolvedKey(data.deepseekKey, data.deepseekFallbackKey, "DEEPSEEK_API_KEY"),
    opencode: resolvedKey(data.opencodeKey, data.opencodeFallbackKey, "OPENCODE_ZEN_API_KEY"),
  };
  const configuredProviders: Record<ChatProvider, boolean> = {
    openrouter: keyAvailable(data.openrouterKey ?? data.openrouterFallbackKey, "OPENROUTER_API_KEY"),
    kilo: keyAvailable(data.kiloKey ?? data.kiloFallbackKey, "KILO_API_KEY"),
    groq: keyAvailable(data.groqKey ?? data.groqFallbackKey, "GROQ_API_KEY"),
    together: keyAvailable(data.togetherKey ?? data.togetherFallbackKey, "TOGETHER_API_KEY"),
    deepseek: keyAvailable(data.deepseekKey ?? data.deepseekFallbackKey, "DEEPSEEK_API_KEY"),
    opencode: keyAvailable(data.opencodeKey ?? data.opencodeFallbackKey, "OPENCODE_ZEN_API_KEY"),
  };
  const discoverModels = async (url: string, provider: ChatProvider, apiKey: string | undefined) => {
    if (!apiKey) return [] as ChatModel[];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetchModels(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });
      if (!response.ok) return [] as ChatModel[];
      const json = (await response.json()) as { data?: OpenRouterModel[] };
      return (json.data ?? [])
        .filter((item): item is { id: string; name?: string } => typeof item.id === "string")
        .slice(0, 250)
        .map((item) => ({
          id: `${provider}:${item.id}`,
          label: item.name ?? item.id,
          provider,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    } catch {
      return [] as ChatModel[];
    } finally {
      clearTimeout(timeout);
    }
  };
  const [openrouter, kilo] = await Promise.all([
    discoverModels("https://openrouter.ai/api/v1/models", "openrouter", providerKeys.openrouter),
    discoverModels("https://api.kilo.ai/api/gateway/models", "kilo", providerKeys.kilo),
  ]);
  return {
    models: [
      ...modelsForConfiguredProviders(CURATED_MODELS, configuredProviders),
      ...openrouter,
      ...kilo,
    ],
    configuredProviders,
  };
}

export const listChatModels = createServerFn({ method: "POST" })
  .inputValidator((d: CatalogInput) => d)
  .handler(async ({ data }) => buildChatModelCatalog(data));
