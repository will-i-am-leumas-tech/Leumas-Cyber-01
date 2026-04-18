import type { CyberModelProvider } from "./base-provider";
import type { ProviderCapability } from "../schemas/providers.schema";

export class OllamaProvider implements CyberModelProvider {
  name = "ollama";
  capabilities: ProviderCapability[] = ["local_only"];

  constructor(
    private readonly baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
    readonly model = process.env.OLLAMA_MODEL ?? "llama3.1"
  ) {}

  async analyze(input: {
    systemPrompt: string;
    userPrompt: string;
    context?: Record<string, unknown>;
  }): Promise<{ text: string; structured?: Record<string, unknown>; raw?: unknown }> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: `${input.systemPrompt}\n\n${input.userPrompt}`,
        stream: false,
        context: input.context
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama provider failed with HTTP ${response.status}`);
    }

    const raw = (await response.json()) as { response?: string };
    return {
      text: raw.response ?? "",
      raw
    };
  }
}
