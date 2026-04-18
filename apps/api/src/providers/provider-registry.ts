import type { CyberModelProvider } from "./base-provider";
import type { ProviderCapability, ProviderConfig, ProviderType } from "../schemas/providers.schema";

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function config(input: {
  id: string;
  name: string;
  type: ProviderType;
  model: string;
  endpoint?: string;
  enabled: boolean;
  capabilities: ProviderCapability[];
  priority: number;
}): ProviderConfig {
  return input;
}

export function providerConfigFromProvider(provider: CyberModelProvider): ProviderConfig {
  return config({
    id: provider.name,
    name: provider.name,
    type: provider.name === "ollama" ? "ollama" : provider.name === "openai-compatible" ? "openai-compatible" : "mock",
    model: provider.model ?? provider.name,
    enabled: true,
    capabilities: provider.capabilities ?? [],
    priority: 0
  });
}

export function getProviderRegistry(activeProvider?: CyberModelProvider): ProviderConfig[] {
  const registry = [
    config({
      id: "local-mock",
      name: "local-mock",
      type: "mock",
      model: "local-mock-deterministic",
      enabled: true,
      capabilities: ["json_schema", "local_only"],
      priority: 10
    }),
    config({
      id: "ollama",
      name: "ollama",
      type: "ollama",
      model: process.env.OLLAMA_MODEL ?? "llama3.1",
      endpoint: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
      enabled: boolFromEnv(process.env.OLLAMA_ENABLED, false),
      capabilities: ["local_only"],
      priority: 20
    }),
    config({
      id: "openai-compatible",
      name: "openai-compatible",
      type: "openai-compatible",
      model: process.env.OPENAI_COMPATIBLE_MODEL ?? "gpt-5.4",
      endpoint: process.env.OPENAI_COMPATIBLE_BASE_URL ?? "https://api.openai.com/v1",
      enabled: boolFromEnv(process.env.OPENAI_COMPATIBLE_ENABLED, Boolean(process.env.OPENAI_COMPATIBLE_API_KEY)),
      capabilities: ["json_schema"],
      priority: 30
    })
  ];

  if (!activeProvider) {
    return registry;
  }

  const active = providerConfigFromProvider(activeProvider);
  const updated = registry.map((candidate) =>
    candidate.id === active.id
      ? {
          ...candidate,
          model: active.model,
          enabled: true,
          capabilities: active.capabilities.length > 0 ? active.capabilities : candidate.capabilities,
          priority: 0
        }
      : candidate
  );
  return updated.some((candidate) => candidate.id === active.id) ? updated : [active, ...updated];
}
