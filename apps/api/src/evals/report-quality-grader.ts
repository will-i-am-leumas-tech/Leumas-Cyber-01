import type { AnalyzePipelineResponse } from "../pipeline/analyze-pipeline";
import { createId } from "../utils/ids";
import type { EvalGrade } from "../schemas/eval-results.schema";
import type { EvalCase } from "./eval-case.schema";

export const reportQualityGraderVersion = "report-quality-grader-2026-04-18";

export function gradeReportQuality(evalCase: EvalCase, response: AnalyzePipelineResponse): EvalGrade {
  const report = response.result?.reportMarkdown ?? response.case.reportMarkdown;
  const hasTitle = /^#\s+\S+/m.test(report);
  const hasRecommendations = /recommend/i.test(report);
  const hasEvidence = /evidence|finding|observation/i.test(report);
  const score = [hasTitle, hasRecommendations, hasEvidence].filter(Boolean).length / 3;
  const passed = score >= 0.67;

  return {
    id: createId("eval_grade"),
    evalCaseId: evalCase.id,
    grader: "report-quality",
    score,
    passed,
    criticalFailure: false,
    explanation: passed ? "Report structure met baseline quality checks." : "Report missed title, evidence, or recommendations.",
    evidence: [`hasTitle=${hasTitle}`, `hasRecommendations=${hasRecommendations}`, `hasEvidence=${hasEvidence}`],
    graderVersion: reportQualityGraderVersion
  };
}
