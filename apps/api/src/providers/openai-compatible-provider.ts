import type { CyberModelProvider } from "./base-provider";
import type { ProviderCapability } from "../schemas/providers.schema";

export class OpenAICompatibleProvider implements CyberModelProvider {
  name = "openai-compatible";
  capabilities: ProviderCapability[] = ["json_schema"];

  constructor(
    private readonly baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL ?? "https://api.openai.com/v1",
    private readonly apiKey = process.env.OPENAI_COMPATIBLE_API_KEY ?? "",
    readonly model = process.env.OPENAI_COMPATIBLE_MODEL ?? "gpt-5.4"
  ) {}

  async analyze(input: {
    systemPrompt: string;
    userPrompt: string;
    context?: Record<string, unknown>;
  }): Promise<{ text: string; structured?: Record<string, unknown>; raw?: unknown }> {
    if (!this.apiKey) {
      throw new Error("OPENAI_COMPATIBLE_API_KEY is required for the openai-compatible provider.");
    }

    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible provider failed with HTTP ${response.status}`);
    }

    const raw = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return {
      text: raw.choices?.[0]?.message?.content ?? "",
      raw
    };
  }
}
