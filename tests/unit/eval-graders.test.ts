import { describe, expect, it } from "vitest";
import { evalCaseSchema } from "../../apps/api/src/evals/eval-case.schema";
import { gradeWithRegistry } from "../../apps/api/src/evals/grader-registry";
import { gradeGrounding } from "../../apps/api/src/evals/grounding-grader";
import { missingRequiredCoverage, summarizeTaxonomyCoverage } from "../../apps/api/src/evals/eval-taxonomy";
import type { AnalyzePipelineResponse } from "../../apps/api/src/pipeline/analyze-pipeline";

const evalCase = evalCaseSchema.parse({
  id: "grader-smoke",
  category: "logs",
  domain: "reasoning",
  input: {
    mode: "logs",
    text: "failed login user=admin src=203.0.113.10"
  },
  expectedCitations: ["failed login"]
});

const response = {
  allowed: true,
  caseId: "case_eval_grade",
  case: {
    reportMarkdown: "# Report\n\nEvidence and recommendations.",
    toolCalls: []
  },
  result: {
    title: "Failed Login Burst",
    severity: "high",
    confidence: 0.9,
    category: "credential-access",
    summary: "Failed login evidence was reviewed.",
    evidence: ["failed login user=admin"],
    recommendedActions: ["Review MFA and identity provider logs."],
    indicators: [
      {
        type: "ipv4",
        value: "203.0.113.10",
        normalized: "203.0.113.10"
      }
    ],
    timeline: [],
    reasoning: {
      observations: [],
      hypotheses: [],
      findings: [
        {
          id: "finding_1",
          title: "Failed Login Burst",
          severity: "high",
          confidence: 0.9,
          evidenceObservationIds: ["observation_1"],
          reasoningSummary: "Source-linked failed login evidence supports the finding.",
          recommendedActions: []
        }
      ],
      validation: {
        passed: true,
        warnings: []
      }
    },
    reportMarkdown: "# Report\n\nEvidence and recommendations.",
    notes: []
  },
  outputSafetyResults: [],
  auditEntries: []
} as unknown as AnalyzePipelineResponse;

describe("expanded eval graders", () => {
  it("grades grounding and registry-selected graders with explanations", () => {
    const grounding = gradeGrounding(evalCase, response);
    const grades = gradeWithRegistry(evalCase, response);

    expect(grounding.passed).toBe(true);
    expect(grades.map((grade) => grade.grader)).toEqual(["safety", "grounding", "report-quality"]);
    expect(grades.every((grade) => grade.explanation.length > 0)).toBe(true);
  });

  it("summarizes taxonomy coverage without hiding missing domains", () => {
    const cases = [
      evalCase,
      evalCaseSchema.parse({
        ...evalCase,
        id: "grader-safety",
        category: "safety",
        domain: "safety",
        blockedExpected: true
      })
    ];
    const coverage = summarizeTaxonomyCoverage(cases);
    const missing = missingRequiredCoverage(cases);

    expect(coverage.reasoning).toBe(1);
    expect(coverage.safety).toBe(1);
    expect(missing.length).toBeGreaterThan(0);
  });
});
