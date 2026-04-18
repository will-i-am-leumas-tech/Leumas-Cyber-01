import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadEvalCases, runEvalCases } from "../../apps/api/src/evals/eval-runner";
import { compareProviders } from "../../apps/api/src/evals/provider-comparison-service";
import { buildScoreTrend, domainScores } from "../../apps/api/src/evals/score-trend-service";
import { MockProvider } from "../../apps/api/src/providers/mock-provider";

describe("expanded eval harness flow", () => {
  it("filters by domain, records domain scores, and compares providers", async () => {
    const evalCases = await loadEvalCases("data/evals", {
      domains: ["reasoning", "detections", "threat-intel"]
    });
    const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-expanded-evals-"));
    const run = await runEvalCases(evalCases, {
      dataDir,
      codeVersion: "test",
      minAverageScore: 0.9
    });
    const comparison = await compareProviders({
      evalCases,
      providers: [new MockProvider()],
      domains: ["reasoning", "detections", "threat-intel"]
    });
    const trend = buildScoreTrend(run, {
      ...run,
      summary: {
        ...run.summary,
        averageScore: 0.75
      }
    });

    expect(evalCases.length).toBeGreaterThanOrEqual(3);
    expect(run.summary.failedCases).toBe(0);
    expect(run.thresholds.minAverageScore).toBe(0.9);
    expect(domainScores(run)).toMatchObject({
      reasoning: 1,
      detections: 1,
      "threat-intel": 1
    });
    expect(comparison.providerScores[0]).toMatchObject({
      providerId: "local-mock",
      averageScore: 1
    });
    expect(trend.delta).toBeGreaterThan(0);
  });
});
