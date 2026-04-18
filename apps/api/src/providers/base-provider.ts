import { defensiveAnalysisSystemPrompt } from "../prompts/defensive-analysis.prompt";
import type { ProviderCapability } from "../schemas/providers.schema";

export interface CyberModelProvider {
  name: string;
  model?: string;
  capabilities?: ProviderCapability[];
  analyze(input: {
    systemPrompt: string;
    userPrompt: string;
    context?: Record<string, unknown>;
  }): Promise<{
    text: string;
    structured?: Record<string, unknown>;
    raw?: unknown;
  }>;
}

export const defensiveSystemPrompt = defensiveAnalysisSystemPrompt;
