import type { CyberModelProvider } from "./base-provider";
import type { ProviderCapability } from "../schemas/providers.schema";

export class MockProvider implements CyberModelProvider {
  name = "local-mock";
  model = "local-mock-deterministic";
  capabilities: ProviderCapability[] = ["json_schema", "local_only"];

  async analyze(input: {
    systemPrompt: string;
    userPrompt: string;
    context?: Record<string, unknown>;
  }): Promise<{ text: string; structured?: Record<string, unknown>; raw?: unknown }> {
    const mode = String(input.context?.mode ?? "analysis");

    return {
      text: `Mock provider completed defensive ${mode} review.`,
      structured: {
        provider: this.name,
        mode,
        deterministic: true
      }
    };
  }
}
