import type { CyberModelProvider } from "./base-provider";
import { MockProvider } from "./mock-provider";
import { OllamaProvider } from "./ollama-provider";
import { OpenAICompatibleProvider } from "./openai-compatible-provider";

export function createProvider(name = process.env.MODEL_PROVIDER ?? "local-mock"): CyberModelProvider {
  switch (name) {
    case "ollama":
      return new OllamaProvider();
    case "openai-compatible":
      return new OpenAICompatibleProvider();
    case "local-mock":
    default:
      return new MockProvider();
  }
}
