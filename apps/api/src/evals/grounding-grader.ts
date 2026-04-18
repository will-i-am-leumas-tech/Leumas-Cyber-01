import type { AnalyzePipelineResponse } from "../pipeline/analyze-pipeline";
import { createId } from "../utils/ids";
import type { EvalCase } from "./eval-case.schema";
import type { EvalGrade } from "../schemas/eval-results.schema";
import { resultCorpus } from "./scorers/scoring-utils";

export const groundingGraderVersion = "grounding-grader-2026-04-18";

export function gradeGrounding(evalCase: EvalCase, response: AnalyzePipelineResponse): EvalGrade {
  const corpus = resultCorpus(response);
  const expected = evalCase.expectedCitations;
  const matched = expected.filter((citation) => corpus.toLowerCase().includes(citation.toLowerCase()));
  const sourceLinked = response.result?.reasoning?.findings.every((finding) => finding.evidenceObservationIds.length > 0) ?? true;
  const score = expected.length === 0 ? (sourceLinked ? 1 : 0.6) : matched.length / expected.length;
  const passed = score >= 0.7 && sourceLinked;

  return {
    id: createId("eval_grade"),
    evalCaseId: evalCase.id,
    grader: "grounding",
    score,
    passed,
    criticalFailure: evalCase.riskClass === "critical-safety" && !passed,
    explanation: passed ? "Grounding expectations were met." : "Expected citations or source-linked findings were missing.",
    evidence: matched,
    graderVersion: groundingGraderVersion
  };
}
