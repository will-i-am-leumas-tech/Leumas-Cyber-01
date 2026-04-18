import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { analyzeAlertOrLogs } from "../../apps/api/src/adapters/log-analyzer.adapter";
import { buildReasoningBundle } from "../../apps/api/src/reasoning/reasoning-service";
import { buildDetectionIntent } from "../../apps/api/src/detections/detection-intent-builder";
import { buildSigmaLikeRule } from "../../apps/api/src/detections/sigma-rule-builder";
import { runRuleTests, validateDetectionRule } from "../../apps/api/src/detections/rule-test-runner";
import type { CyberCase } from "../../apps/api/src/schemas/case.schema";
import type { DetectionRule, RuleTestCase } from "../../apps/api/src/schemas/detections.schema";

function testCaseFromFixture(raw: string): RuleTestCase {
  return JSON.parse(raw) as RuleTestCase;
}

describe("detection services", () => {
  it("builds detection intent with evidence refs from a PowerShell case", async () => {
    const alert = await readFile("data/fixtures/alerts/powershell-encoded.json", "utf8");
    const adapterResult = analyzeAlertOrLogs(alert, "alert");
    const reasoning = buildReasoningBundle({ ...adapterResult, notes: [] }, []);
    const cyberCase = {
      id: "case_test",
      title: adapterResult.title,
      createdAt: "2026-04-16T00:00:00.000Z",
      updatedAt: "2026-04-16T00:00:00.000Z",
      inputType: "pasted-json",
      mode: "alert",
      rawInputRef: "inline-json",
      normalizedArtifacts: [],
      severity: adapterResult.severity,
      state: "new",
      priority: "high",
      tags: [],
      tasks: [],
      decisions: [],
      workflowTransitions: [],
      toolCalls: [],
      toolResults: [],
      actionPlans: [],
      approvalRequests: [],
      actionExecutions: [],
      detectionIntents: [],
      detectionRules: [],
      ruleTestCases: [],
      ruleValidationResults: [],
      summary: adapterResult.summary,
      recommendations: adapterResult.recommendedActions,
      reportMarkdown: "",
      result: {
        ...adapterResult,
        reasoning,
        reportMarkdown: ""
      },
      auditEntries: []
    } satisfies CyberCase;

    const intent = buildDetectionIntent(cyberCase, 1);
    const rule = buildSigmaLikeRule(intent, 1);

    expect(intent.evidenceRefs.length).toBeGreaterThan(0);
    expect(intent.dataSources).toContain("endpoint.process_creation");
    expect(rule.logic.logsource.category).toBe("process_creation");
    expect(rule.query).toContain("process.commandLine");
  });

  it("validates generated rule and passes positive and negative fixtures", async () => {
    const alert = await readFile("data/fixtures/alerts/powershell-encoded.json", "utf8");
    const adapterResult = analyzeAlertOrLogs(alert, "alert");
    const reasoning = buildReasoningBundle({ ...adapterResult, notes: [] }, []);
    const cyberCase = {
      id: "case_test",
      title: adapterResult.title,
      createdAt: "2026-04-16T00:00:00.000Z",
      updatedAt: "2026-04-16T00:00:00.000Z",
      inputType: "pasted-json",
      mode: "alert",
      rawInputRef: "inline-json",
      normalizedArtifacts: [],
      severity: adapterResult.severity,
      state: "new",
      priority: "high",
      tags: [],
      tasks: [],
      decisions: [],
      workflowTransitions: [],
      toolCalls: [],
      toolResults: [],
      actionPlans: [],
      approvalRequests: [],
      actionExecutions: [],
      detectionIntents: [],
      detectionRules: [],
      ruleTestCases: [],
      ruleValidationResults: [],
      summary: adapterResult.summary,
      recommendations: adapterResult.recommendedActions,
      reportMarkdown: "",
      result: {
        ...adapterResult,
        reasoning,
        reportMarkdown: ""
      },
      auditEntries: []
    } satisfies CyberCase;
    const rule = buildSigmaLikeRule(buildDetectionIntent(cyberCase, 1), 1);
    const positive = testCaseFromFixture(await readFile("data/fixtures/detections/powershell-positive.json", "utf8"));
    const negative = testCaseFromFixture(await readFile("data/fixtures/detections/powershell-negative-admin.json", "utf8"));
    const validation = runRuleTests(rule, [positive, negative]);

    expect(validateDetectionRule(rule).passed).toBe(true);
    expect(validation.passed).toBe(true);
    expect(validation.testResults.map((result) => result.actualMatch)).toEqual([true, false]);
  });

  it("rejects invalid rules without required logsource or detection logic", async () => {
    const invalidRule = JSON.parse(await readFile("data/fixtures/detections/invalid-rule.json", "utf8")) as DetectionRule;
    const validation = validateDetectionRule(invalidRule);

    expect(validation.passed).toBe(false);
    expect(validation.warnings.join(" ")).toContain("logic.logsource");
  });
});
