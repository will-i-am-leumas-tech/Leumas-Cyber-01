import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { MockProvider } from "../../apps/api/src/providers/mock-provider";
import { getProviderRegistry } from "../../apps/api/src/providers/provider-registry";
import { selectProviderForTask } from "../../apps/api/src/providers/provider-router";
import { validateProviderStructuredOutput } from "../../apps/api/src/providers/structured-output";
import { buildProviderCall, UsageAccountingService } from "../../apps/api/src/providers/usage-accounting";

async function readFixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(`data/fixtures/providers/${name}`, "utf8")) as Record<string, unknown>;
}

describe("provider maturity services", () => {
  it("registers providers and selects deterministic routes", () => {
    const registry = getProviderRegistry(new MockProvider());

    expect(registry.find((provider) => provider.id === "local-mock")?.enabled).toBe(true);
    expect(selectProviderForTask(registry, "eval").id).toBe("local-mock");
    expect(selectProviderForTask(registry, "safety").capabilities).toContain("local_only");
  });

  it("validates structured provider outputs", async () => {
    const valid = await readFixture("valid-structured-output.json");
    const invalid = await readFixture("invalid-structured-output.json");

    expect(
      validateProviderStructuredOutput({
        providerCallId: "provider_call_001",
        schemaName: "provider-readiness",
        output: valid
      }).status
    ).toBe("passed");
    expect(
      validateProviderStructuredOutput({
        providerCallId: "provider_call_002",
        schemaName: "provider-readiness",
        output: invalid
      }).status
    ).toBe("failed");
    expect(
      validateProviderStructuredOutput({
        providerCallId: "provider_call_003",
        schemaName: "provider-readiness"
      }).status
    ).toBe("not_provided");
  });

  it("records usage summaries from provider calls", () => {
    const usage = new UsageAccountingService();
    const providerCall = buildProviderCall({
      caseId: "case_provider_fixture",
      provider: "local-mock",
      model: "local-mock-deterministic",
      promptVersion: "defensive-analysis-v1",
      taskType: "alert",
      status: "completed",
      systemPrompt: "system",
      userPrompt: "user prompt",
      outputText: "provider output",
      startedAt: "2026-04-17T13:00:00.000Z",
      completedAt: "2026-04-17T13:00:01.000Z"
    });

    usage.record(providerCall);

    expect(providerCall.latencyMs).toBe(1000);
    expect(usage.summarize()).toMatchObject([
      {
        provider: "local-mock",
        calls: 1,
        failures: 0,
        totalTokens: providerCall.tokens.totalTokens
      }
    ]);
  });
});
