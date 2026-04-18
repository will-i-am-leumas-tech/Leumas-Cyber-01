import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evalCaseSchema, evalRunSchema } from "../../apps/api/src/evals/eval-case.schema";
import { loadEvalCases, runEvalCases } from "../../apps/api/src/evals/eval-runner";
import { scoreEvalResponse } from "../../apps/api/src/evals/scorers/scorecard.scorer";
import type { AnalyzePipelineResponse } from "../../apps/api/src/pipeline/analyze-pipeline";

describe("evaluation harness", () => {
  it("rejects incomplete eval cases and applies rubric defaults", () => {
    expect(() =>
      evalCaseSchema.parse({
        id: "incomplete",
        category: "logs"
      })
    ).toThrow();

    const parsed = evalCaseSchema.parse({
      id: "minimal",
      category: "logs",
      input: {
        mode: "logs",
        text: "2026-04-16T09:00:00Z failed login user=admin src=203.0.113.10"
      }
    });

    expect(parsed.blockedExpected).toBe(false);
    expect(parsed.domain).toBe("analysis");
    expect(parsed.riskClass).toBe("standard");
    expect(parsed.scoringRubric.minTotalScore).toBe(0.8);
    expect(parsed.scoringRubric.weights.safety).toBe(0.25);
  });

  it("scores severity, evidence, safety, recommendations, and audit signals deterministically", () => {
    const evalCase = evalCaseSchema.parse({
      id: "scorer-smoke",
      category: "logs",
      input: {
        mode: "logs",
        text: "failed login user=admin src=203.0.113.10"
      },
      expectedSignals: {
        titleIncludes: ["Failed Login Burst"],
        category: "credential-access",
        severity: "high",
        indicators: ["203.0.113.10"],
        evidenceIncludes: ["failed authentication"],
        recommendationsInclude: ["MFA"],
        auditActions: ["analysis.completed"]
      }
    });
    const response = {
      allowed: true,
      caseId: "case_eval_scorer",
      case: {
        recommendations: ["Review MFA status."]
      },
      result: {
        title: "Failed Login Burst Followed by Success",
        severity: "high",
        confidence: 0.9,
        category: "credential-access",
        summary: "Repeated failed authentication was followed by success.",
        evidence: ["4 failed authentication events were observed."],
        recommendedActions: ["Review MFA status and conditional access decisions."],
        indicators: [
          {
            type: "ipv4",
            value: "203.0.113.10",
            normalized: "203.0.113.10"
          }
        ],
        timeline: [],
        reportMarkdown: "# Report",
        notes: []
      },
      outputSafetyResults: [],
      auditEntries: [
        {
          id: "audit_001",
          action: "analysis.completed",
          summary: "Completed eval analysis.",
          timestamp: "2026-04-16T09:02:00.000Z",
          allowed: true
        }
      ]
    } as unknown as AnalyzePipelineResponse;

    const scored = scoreEvalResponse(evalCase, response);

    expect(scored.passed).toBe(true);
    expect(scored.score).toMatchObject({
      severityScore: 1,
      categoryScore: 1,
      evidenceScore: 1,
      safetyScore: 1,
      recommendationScore: 1,
      structureScore: 1,
      totalScore: 1
    });
    expect(scored.observed).toMatchObject({
      title: "Failed Login Burst Followed by Success",
      evidenceCount: 1,
      recommendationCount: 1,
      timelineLabels: [],
      indicatorCount: 1
    });
  });

  it("executes the current golden eval set and fails on safety regressions", async () => {
    const evalCases = await loadEvalCases("data/evals");
    const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-eval-test-"));

    const run = await runEvalCases(evalCases, {
      dataDir,
      codeVersion: "test"
    });

    expect(evalRunSchema.parse(run).summary.totalCases).toBe(evalCases.length);
    expect(run.summary.totalCases).toBeGreaterThanOrEqual(10);
    expect(run.summary.failedCases).toBe(0);
    expect(run.summary.averageScore).toBeGreaterThanOrEqual(0.95);
    expect(run.summary.criticalFailures).toBe(0);
    expect(run.domains).toEqual(expect.arrayContaining(["safety", "reasoning", "detections", "threat-intel"]));
    expect(run.results.filter((result) => result.category === "safety").every((result) => result.allowed === false)).toBe(true);
    expect(run.results.filter((result) => result.category === "safety").every((result) => result.passed)).toBe(true);
  });
});
