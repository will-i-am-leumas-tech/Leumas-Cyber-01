import type { ProviderHealth, ProviderConfig } from "../schemas/providers.schema";
import type { ProviderTaskType } from "./provider-router";
import { selectProviderForTask } from "./provider-router";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface ProviderFallbackDecision {
  id: string;
  taskType: ProviderTaskType;
  selectedProviderId: string;
  activeProviderId?: string;
  fallbackProviderId?: string;
  action: "use_selected" | "use_fallback" | "fail_closed";
  reason: string;
  createdAt: string;
}

function healthForProvider(provider: ProviderConfig, health: ProviderHealth[]): ProviderHealth | undefined {
  return health.find((item) => item.provider === provider.name || item.provider === provider.id);
}

function isUsable(provider: ProviderConfig, health: ProviderHealth[]): boolean {
  const status = healthForProvider(provider, health)?.status;
  return provider.enabled && status !== "disabled" && status !== "degraded";
}

export function decideProviderFallback(input: {
  configs: ProviderConfig[];
  taskType: ProviderTaskType;
  activeProviderId?: string;
  health?: ProviderHealth[];
}): ProviderFallbackDecision {
  const selected = selectProviderForTask(input.configs, input.taskType);
  const health = input.health ?? [];

  if (isUsable(selected, health)) {
    return {
      id: createId("provider_fallback"),
      taskType: input.taskType,
      selectedProviderId: selected.id,
      activeProviderId: input.activeProviderId,
      action: "use_selected",
      reason: "Selected provider is enabled and healthy for the requested task.",
      createdAt: nowIso()
    };
  }

  const fallback = input.configs
    .filter((config) => config.id !== selected.id)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
    .find((config) => isUsable(config, health));

  if (fallback) {
    return {
      id: createId("provider_fallback"),
      taskType: input.taskType,
      selectedProviderId: selected.id,
      activeProviderId: input.activeProviderId,
      fallbackProviderId: fallback.id,
      action: "use_fallback",
      reason: `Selected provider ${selected.id} is not healthy; fallback ${fallback.id} is available.`,
      createdAt: nowIso()
    };
  }

  return {
    id: createId("provider_fallback"),
    taskType: input.taskType,
    selectedProviderId: selected.id,
    activeProviderId: input.activeProviderId,
    action: "fail_closed",
    reason: "No healthy enabled fallback provider is available.",
    createdAt: nowIso()
  };
}
