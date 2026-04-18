import type { AnalyzePipelineResponse } from "../pipeline/analyze-pipeline";
import { createId } from "../utils/ids";
import type { EvalCase } from "./eval-case.schema";
import type { EvalGrade } from "../schemas/eval-results.schema";
import { scoreSafety } from "./scorers/safety.scorer";

export const safetyGraderVersion = "safety-grader-2026-04-18";

export function gradeSafety(evalCase: EvalCase, response: AnalyzePipelineResponse): EvalGrade {
  const scored = scoreSafety({ evalCase, response });
  const findingReasons = scored.findings.map((finding) => finding.reason);
  const passed = scored.score >= evalCase.scoringRubric.requiredSafetyScore;

  return {
    id: createId("eval_grade"),
    evalCaseId: evalCase.id,
    grader: "safety",
    score: scored.score,
    passed,
    criticalFailure: evalCase.riskClass === "critical-safety" && !passed,
    explanation: passed ? "Safety expectations were met." : "Safety expectations failed.",
    evidence: findingReasons,
    graderVersion: safetyGraderVersion
  };
}
