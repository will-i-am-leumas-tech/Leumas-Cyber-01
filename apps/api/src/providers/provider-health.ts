import type { CyberModelProvider } from "./base-provider";
import type { ProviderConfig, ProviderHealth } from "../schemas/providers.schema";
import { nowIso } from "../utils/time";

export function checkProviderHealth(config: ProviderConfig, activeProvider?: CyberModelProvider): ProviderHealth {
  const started = Date.now();
  if (!config.enabled) {
    return {
      provider: config.name,
      model: config.model,
      status: "disabled",
      latencyMs: Date.now() - started,
      checkedAt: nowIso(),
      message: "Provider is configured but disabled."
    };
  }

  if (activeProvider?.name === config.name || config.type === "mock") {
    return {
      provider: config.name,
      model: config.model,
      status: "healthy",
      latencyMs: Date.now() - started,
      checkedAt: nowIso(),
      message: "Provider is available for local routing."
    };
  }

  return {
    provider: config.name,
    model: config.model,
    status: "degraded",
    latencyMs: Date.now() - started,
    checkedAt: nowIso(),
    message: "Provider is enabled but not active in this process."
  };
}
