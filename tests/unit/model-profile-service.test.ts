import { describe, expect, it } from "vitest";
import { MockProvider } from "../../apps/api/src/providers/mock-provider";
import { getModelProfiles } from "../../apps/api/src/models/model-profile-registry";
import { listPromptVersions } from "../../apps/api/src/prompts/prompt-registry";
import { decideProviderFallback } from "../../apps/api/src/providers/provider-fallback-policy";
import { runProviderComparison } from "../../apps/api/src/providers/provider-comparison-runner";
import { loadEvalCases } from "../../apps/api/src/evals/eval-runner";

describe("model profile service", () => {
  it("builds model profiles and prompt version records for configured providers", () => {
    const profiles = getModelProfiles(new MockProvider());
    const localMock = profiles.find((profile) => profile.providerId === "local-mock");

    expect(localMock).toMatchObject({
      tier: "mock",
      supportsStructuredOutput: true,
      safetyReviewRequired: false,
      dataResidency: "local"
    });
    expect(profiles.find((profile) => profile.providerId === "openai-compatible")).toMatchObject({
      tier: "frontier",
      supportsStructuredOutput: true,
      safetyReviewRequired: true
    });

    const promptVersions = listPromptVersions();
    expect(promptVersions[0]).toMatchObject({
      taskType: "defensive-analysis",
      schemaName: "defensive-analysis-provider",
      minEvalScore: 0.8
    });
    expect(promptVersions[0].promptHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("chooses healthy fallback providers without hiding fail-closed cases", () => {
    const configs = [
      {
        id: "frontier-primary",
        name: "frontier-primary",
        type: "openai-compatible" as const,
        model: "frontier",
        enabled: true,
        capabilities: ["json_schema" as const],
        priority: 0
      },
      {
        id: "local-mock",
        name: "local-mock",
        type: "mock" as const,
        model: "local-mock-deterministic",
        enabled: true,
        capabilities: ["json_schema" as const, "local_only" as const],
        priority: 10
      }
    ];

    const fallback = decideProviderFallback({
      configs,
      taskType: "alert",
      activeProviderId: "frontier-primary",
      health: [
        {
          provider: "frontier-primary",
          model: "frontier",
          status: "degraded",
          latencyMs: 10,
          checkedAt: "2026-04-18T00:00:00.000Z",
          message: "Provider is degraded."
        },
        {
          provider: "local-mock",
          model: "local-mock-deterministic",
          status: "healthy",
          latencyMs: 1,
          checkedAt: "2026-04-18T00:00:00.000Z",
          message: "Provider is healthy."
        }
      ]
    });

    expect(fallback).toMatchObject({
      action: "use_fallback",
      selectedProviderId: "frontier-primary",
      fallbackProviderId: "local-mock"
    });

    const failClosed = decideProviderFallback({
      configs: [configs[0]],
      taskType: "alert",
      health: [
        {
          provider: "frontier-primary",
          model: "frontier",
          status: "degraded",
          latencyMs: 10,
          checkedAt: "2026-04-18T00:00:00.000Z",
          message: "Provider is degraded."
        }
      ]
    });

    expect(failClosed.action).toBe("fail_closed");
  });

  it("compares providers against eval cases with scorecard metadata", async () => {
    const evalCases = (await loadEvalCases()).slice(0, 1);
    const comparison = await runProviderComparison({
      evalCases,
      providers: [new MockProvider()]
    });

    expect(comparison.summary).toMatchObject({
      bestProvider: "local-mock",
      providerCount: 1,
      totalCases: 1
    });
    expect(comparison.providers[0]).toMatchObject({
      provider: "local-mock",
      totalCases: 1,
      safetyFailures: 0
    });
  });
});
