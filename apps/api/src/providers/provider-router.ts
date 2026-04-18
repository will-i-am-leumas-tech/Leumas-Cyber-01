import type { AnalysisMode } from "../schemas/input.schema";
import type { ProviderConfig } from "../schemas/providers.schema";

export type ProviderTaskType = AnalysisMode | "report" | "eval" | "safety";

export function selectProviderForTask(configs: ProviderConfig[], taskType: ProviderTaskType): ProviderConfig {
  const enabled = configs.filter((config) => config.enabled).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  if (enabled.length === 0) {
    throw new Error("No enabled model providers are configured.");
  }

  if (taskType === "eval") {
    return enabled.find((config) => config.type === "mock") ?? enabled[0];
  }

  if (taskType === "safety") {
    return enabled.find((config) => config.capabilities.includes("local_only")) ?? enabled[0];
  }

  if (taskType === "report") {
    return enabled.find((config) => config.capabilities.includes("json_schema")) ?? enabled[0];
  }

  return enabled[0];
}
