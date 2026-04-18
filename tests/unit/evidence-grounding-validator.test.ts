import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "../../apps/api/src/schemas/result.schema";
import { validateEvidenceGrounding } from "../../apps/api/src/reasoning/evidence-grounding-validator";

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    title: "Suspicious PowerShell Execution",
    severity: "high",
    confidence: 0.86,
    category: "execution",
    summary: "PowerShell execution includes encoded command behavior.",
    evidence: ["PowerShell execution was observed.", "Command line contains encoded-command behavior."],
    recommendedActions: ["Collect the parent-child process tree and command-line telemetry."],
    indicators: [],
    timeline: [],
    reportMarkdown: "# Report",
    notes: [],
    ...overrides
  };
}

describe("evidence grounding validator", () => {
  it("marks evidence-backed high-impact claims as supported", () => {
    const findings = validateEvidenceGrounding({
      caseId: "case_grounded",
      result: buildResult()
    });

    expect(findings.map((finding) => finding.status)).toContain("supported");
    expect(findings.find((finding) => finding.claimType === "severity")).toMatchObject({
      status: "supported",
      analystReviewRequired: false
    });
  });

  it("flags unsupported claims for analyst review", () => {
    const findings = validateEvidenceGrounding({
      caseId: "case_unsupported",
      result: buildResult({
        title: "Confirmed Total Host Compromise",
        summary: "The host is fully compromised and data theft is confirmed.",
        recommendedActions: ["Rebuild the host because total compromise is confirmed."]
      })
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "unsupported",
          analystReviewRequired: true
        })
      ])
    );
  });
});
