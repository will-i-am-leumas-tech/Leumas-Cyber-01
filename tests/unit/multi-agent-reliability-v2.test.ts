import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { evaluateAgentBudget } from "../../apps/api/src/agents/agent-budget-service";
import { arbitrateAgentResults } from "../../apps/api/src/agents/arbitration-service";
import { listAgentRoleContracts } from "../../apps/api/src/agents/agent-role-registry";
import { buildAgentMemory } from "../../apps/api/src/agents/agent-memory-service";
import { runReviewerAgent } from "../../apps/api/src/agents/reviewer-agent";
import type { AgentResult } from "../../apps/api/src/schemas/agents.schema";
import { cyberCaseSchema, type CyberCase } from "../../apps/api/src/schemas/case.schema";

function buildCase(): CyberCase {
  return cyberCaseSchema.parse({
    id: "case_agents_v2",
    title: "Agent Reliability",
    createdAt: "2026-04-18T00:00:00.000Z",
    updatedAt: "2026-04-18T00:00:00.000Z",
    inputType: "inline:text",
    mode: "logs",
    rawInputRef: "memory://agents-v2",
    normalizedArtifacts: [],
    severity: "high",
    summary: "Suspicious PowerShell execution.",
    recommendations: ["Review endpoint telemetry."],
    reportMarkdown: "# Report\n\nEvidence and recommendations.",
    result: {
      title: "Suspicious PowerShell",
      severity: "high",
      confidence: 0.9,
      category: "execution",
      summary: "Suspicious PowerShell execution.",
      evidence: ["PowerShell spawned from Office."],
      recommendedActions: ["Review endpoint telemetry."],
      indicators: [],
      timeline: [],
      reasoning: {
        observations: [
          {
            id: "observation_001",
            type: "fact",
            value: "PowerShell spawned from Office.",
            confidence: 0.9,
            sourceRef: {
              id: "artifact_001",
              type: "input",
              locator: "line:1"
            },
            entityRefs: []
          }
        ],
        hypotheses: [],
        findings: [
          {
            id: "finding_001",
            title: "Office spawned PowerShell",
            severity: "high",
            category: "execution",
            confidence: 0.9,
            reasoningSummary: "Observation supports suspicious execution.",
            evidenceObservationIds: ["observation_001"],
            recommendations: ["Preserve telemetry."],
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
}

describe("multi-agent reliability v2", () => {
  it("loads role contracts and enforces budgets", async () => {
    const fixture = JSON.parse(await readFile("data/fixtures/agents/specialist-role-contracts.json", "utf8"));
    const contracts = listAgentRoleContracts();
    const denied = evaluateAgentBudget({
      role: "investigator",
      durationMs: 2500,
      toolCallCount: 0,
      memoryItemCount: 0
    });

    expect(contracts.map((contract) => contract.id)).toEqual(expect.arrayContaining(["investigator", "safetyReviewer"]));
    expect(fixture[0].budget.maxTaskMs).toBe(2000);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("task_timeout_budget_exceeded");
  });

  it("builds evidence-grounded memory and reviewer findings", () => {
    const cyberCase = buildCase();
    const memory = buildAgentMemory(cyberCase);
    const reviewer = runReviewerAgent({
      cyberCase,
      runId: "orchestration_001",
      results: []
    });

    expect(memory[0]).toMatchObject({
      caseId: cyberCase.id,
      evidenceIds: ["observation_001"],
      reviewState: "pending"
    });
    expect(reviewer.status).toBe("passed");
    expect(reviewer.groundingFailures).toHaveLength(0);
  });

  it("arbitrates conflicting specialist results with explicit rationale", async () => {
    const cyberCase = buildCase();
    const results = JSON.parse(await readFile("data/fixtures/agents/conflicting-specialist-findings.json", "utf8")) as AgentResult[];
    const arbitration = arbitrateAgentResults({
      cyberCase,
      runId: "orchestration_fixture",
      results
    });

    expect(arbitration.reviewerStatus).toBe("failed");
    expect(arbitration.conflictRefs).toEqual(expect.arrayContaining(["agent_result_conflict"]));
    expect(arbitration.rationale).toContain("operator review");
    expect(arbitration.evidenceIds).toEqual(["observation_001"]);
  });
});
