import type { CyberModelProvider } from "../providers/base-provider";
import { getProviderRegistry } from "../providers/provider-registry";
import type { ProviderConfig } from "../schemas/providers.schema";
import { modelProfileSchema, type ModelProfile, type ModelTier } from "./model-profile.schema";

function tierForProvider(config: ProviderConfig): ModelTier {
  if (config.type === "mock") {
    return "mock";
  }
  if (config.type === "ollama") {
    return "local";
  }
  return "frontier";
}

function contextWindowForProvider(config: ProviderConfig): number {
  if (config.type === "mock") {
    return 8192;
  }
  if (config.type === "ollama") {
    return 32768;
  }
  return 128000;
}

function maxOutputForProvider(config: ProviderConfig): number {
  if (config.type === "mock") {
    return 2048;
  }
  if (config.type === "ollama") {
    return 4096;
  }
  return 8192;
}

function latencyTargetForProvider(config: ProviderConfig): number {
  if (config.type === "mock") {
    return 250;
  }
  if (config.type === "ollama") {
    return 10000;
  }
  return 15000;
}

function notesForProvider(config: ProviderConfig): string[] {
  if (config.type === "mock") {
    return ["Deterministic local provider for tests, fixtures, and offline quality gates."];
  }
  if (config.type === "ollama") {
    return ["Local model profile. Validate model quality before using for analyst-facing responses."];
  }
  return [
    "Frontier-compatible provider profile. Requires structured output validation, safety validation, and evidence grounding before final use."
  ];
}

export function buildModelProfile(config: ProviderConfig): ModelProfile {
  return modelProfileSchema.parse({
    id: `${config.id}:${config.model}`,
    providerId: config.id,
    label: `${config.name} ${config.model}`,
    type: config.type,
    model: config.model,
    tier: tierForProvider(config),
    enabled: config.enabled,
    capabilities: config.capabilities,
    contextWindowTokens: contextWindowForProvider(config),
    maxOutputTokens: maxOutputForProvider(config),
    supportsStructuredOutput: config.capabilities.includes("json_schema"),
    supportsToolUse: config.capabilities.includes("tool_calling"),
    latencyTargetMs: latencyTargetForProvider(config),
    safetyReviewRequired: config.type !== "mock",
    dataResidency: config.type === "ollama" || config.type === "mock" ? "local" : "provider-managed",
    notes: notesForProvider(config)
  });
}

export function getModelProfiles(activeProvider?: CyberModelProvider): ModelProfile[] {
  return getProviderRegistry(activeProvider).map(buildModelProfile);
}

export function getActiveModelProfile(activeProvider: CyberModelProvider): ModelProfile {
  const profiles = getModelProfiles(activeProvider);
  return (
    profiles.find((profile) => profile.providerId === activeProvider.name) ??
    buildModelProfile({
      id: activeProvider.name,
      name: activeProvider.name,
      type: "mock",
      model: activeProvider.model ?? activeProvider.name,
      enabled: true,
      capabilities: activeProvider.capabilities ?? [],
      priority: 0
    })
  );
}
