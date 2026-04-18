import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createStandardOrchestration } from "../../apps/api/src/agents/agent-orchestrator";
import { runEvalCases, loadEvalCases } from "../../apps/api/src/evals/eval-runner";
import { cyberCaseSchema } from "../../apps/api/src/schemas/case.schema";

describe("multi-agent investigation eval", () => {
  it("keeps deterministic agent investigation attributable and reviewable", async () => {
    const evalCases = await loadEvalCases("data/evals", {
      domains: ["reasoning"]
    });
    const run = await runEvalCases(evalCases, {
      dataDir: await mkdtemp(path.join(os.tmpdir(), "leumas-agent-eval-")),
      codeVersion: "test"
    });
    expect(run.results[0].caseId).toBeDefined();
    const cyberCase = cyberCaseSchema.parse({
      id: "case_agent_eval",
      title: "Agent Eval",
      createdAt: "2026-04-18T00:00:00.000Z",
      updatedAt: "2026-04-18T00:00:00.000Z",
      inputType: "inline:text",
      mode: "logs",
      rawInputRef: "eval",
      normalizedArtifacts: [],
      severity: "high",
      summary: "Eval case.",
      recommendations: ["Review evidence."],
      reportMarkdown: "# Report\n\nEvidence and recommendations.",
      result: {
        title: "Eval case",
        severity: "high",
        confidence: 0.9,
        category: "credential-access",
        summary: "Eval case.",
        evidence: ["4 failed authentication events were observed."],
        recommendedActions: ["Review MFA."],
        indicators: [],
        timeline: [],
        reasoning: {
          observations: [
            {
              id: "observation_eval",
              type: "fact",
              value: "4 failed authentication events were observed.",
              confidence: 0.9,
              sourceRef: {
                id: "eval",
                type: "input",
                locator: "eval"
              },
              entityRefs: []
            }
          ],
          hypotheses: [],
          findings: [
            {
              id: "finding_eval",
              title: "Failed authentication burst",
              severity: "high",
              category: "credential-access",
              confidence: 0.9,
              reasoningSummary: "Evidence supports authentication abuse review.",
              evidenceObservationIds: ["observation_eval"],
              recommendations: ["Review MFA."],
              needsAnalystReview: false
            }
          ],
          reasoningRuns: []
        },
        reportMarkdown: "# Report\n\nEvidence and recommendations.",
        notes: []
      },
      auditEntries: []
    });
    const orchestration = createStandardOrchestration(cyberCase, "agent-eval-plan");

    expect(run.summary.failedCases).toBe(0);
    expect(orchestration.traces).toHaveLength(6);
    expect(orchestration.reviewerFinding.status).toBe("passed");
    expect(orchestration.arbitrationV2.reviewerStatus).toBe("passed");
  });
});
