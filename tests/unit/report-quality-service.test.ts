import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validateReportCitations } from "../../apps/api/src/reports/citation-validator";
import { redactReportDraft } from "../../apps/api/src/reports/redaction-service";
import { getReportTemplate } from "../../apps/api/src/reports/template-registry";
import type { CyberCase } from "../../apps/api/src/schemas/case.schema";
import type { ReportDraft } from "../../apps/api/src/schemas/reports.schema";
import { validateRequiredReportSections } from "../../apps/api/src/services/report-service";

function buildCase(): CyberCase {
  return {
    id: "case_report_quality",
    title: "Suspicious PowerShell Execution",
    createdAt: "2026-04-16T00:00:00.000Z",
    updatedAt: "2026-04-16T00:00:00.000Z",
    inputType: "json",
    mode: "alert",
    rawInputRef: "memory:test",
    normalizedArtifacts: [],
    severity: "high",
    state: "new",
    priority: "high",
    tags: ["execution"],
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
    reportTemplates: [],
    reportDrafts: [],
    reportVersions: [],
    reportCitations: [],
    redactionResults: [],
    summary: "Encoded PowerShell was observed.",
    recommendations: ["Collect process tree."],
    reportMarkdown: "# Suspicious PowerShell Execution",
    result: {
      title: "Suspicious PowerShell Execution",
      severity: "high",
      confidence: 0.82,
      category: "execution",
      summary: "Encoded PowerShell was observed.",
      evidence: ["Event ID 4688 shows powershell.exe execution."],
      recommendedActions: ["Collect process tree."],
      indicators: [],
      timeline: [],
      notes: [],
      reportMarkdown: "# Suspicious PowerShell Execution",
      reasoning: {
        observations: [
          {
            id: "obs_1",
            type: "fact",
            value: "PowerShell launched with encoded command indicators.",
            confidence: 0.9,
            sourceRef: {
              id: "alert:1",
              type: "input",
              locator: "alert.process.commandLine"
            },
            entityRefs: []
          }
        ],
        hypotheses: [],
        findings: [
          {
            id: "finding_1",
            title: "Suspicious PowerShell Execution",
            severity: "high",
            category: "execution",
            confidence: 0.88,
            reasoningSummary: "The process command line contains encoded command indicators.",
            evidenceObservationIds: ["obs_1"],
            recommendations: ["Collect process tree."],
            needsAnalystReview: false
          }
        ],
        reasoningRuns: [],
        assumptions: [],
        unknowns: []
      }
    },
    auditEntries: []
  };
}

describe("report quality services", () => {
  it("enforces required report sections", () => {
    const template = getReportTemplate("technical-template");
    expect(template).toBeDefined();

    const warnings = validateRequiredReportSections(template!, "# Report\n\n## Overview\nOnly one section.");

    expect(warnings).toEqual(expect.arrayContaining(["Missing required section: Severity."]));
  });

  it("rejects citations that point at unknown evidence", async () => {
    const citation = JSON.parse(await readFile("data/fixtures/reports/report-with-missing-citation.json", "utf8"));
    const validation = validateReportCitations(buildCase(), [citation]);

    expect(validation.passed).toBe(false);
    expect(validation.invalidCitationIds).toContain("report_missing_citation");
    expect(validation.missingFindingIds).toContain("finding_1");
  });

  it("redacts IPs, emails, usernames, and secrets without retaining original values", () => {
    const draft: ReportDraft = {
      id: "report_1",
      caseId: "case_report_quality",
      templateId: "technical-template",
      audience: "technical",
      title: "Technical Incident Report",
      contentMarkdown:
        "Contact analyst@example.test about src=203.0.113.10 user=admin token=super-secret-value before sharing.",
      citations: [],
      status: "draft",
      createdBy: "system",
      createdAt: "2026-04-16T00:00:00.000Z",
      updatedAt: "2026-04-16T00:00:00.000Z"
    };

    const redaction = redactReportDraft(draft, "external");

    expect(redaction.redactedMarkdown).toContain("[REDACTED_EMAIL]");
    expect(redaction.redactedMarkdown).toContain("[REDACTED_IP]");
    expect(redaction.redactedMarkdown).toContain("[REDACTED_USER]");
    expect(redaction.redactedMarkdown).toContain("[REDACTED_SECRET]");
    expect(JSON.stringify(redaction.redactedFields)).not.toContain("super-secret-value");
  });
});
