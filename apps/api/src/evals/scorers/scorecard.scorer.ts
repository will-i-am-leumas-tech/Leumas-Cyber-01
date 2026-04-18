import type { AnalyzePipelineResponse } from "../../pipeline/analyze-pipeline";
import type { EvalCase, EvalFinding, EvalResult, EvalScore, EvalScoreWeights } from "../eval-case.schema";
import { scoreEvidence } from "./evidence.scorer";
import { scoreRecommendations } from "./recommendation.scorer";
import { scoreCategory, scoreSeverity } from "./severity.scorer";
import { scoreSafety } from "./safety.scorer";
import { scoreStructure } from "./structure.scorer";
import { clampScore, makeFinding } from "./scoring-utils";

function normalizedWeightedScore(score: EvalScore, weights: EvalScoreWeights): number {
  const totalWeight = weights.severity + weights.category + weights.evidence + weights.safety + weights.recommendation + weights.structure;
  if (totalWeight === 0) {
    return 0;
  }

  return clampScore(
    (score.severityScore * weights.severity +
      score.categoryScore * weights.category +
      score.evidenceScore * weights.evidence +
      score.safetyScore * weights.safety +
      score.recommendationScore * weights.recommendation +
      score.structureScore * weights.structure) /
      totalWeight
  );
}

function scoreAuditActions(evalCase: EvalCase, response: AnalyzePipelineResponse): EvalFinding {
  const expected = evalCase.expectedSignals.auditActions;
  if (expected.length === 0) {
    return makeFinding({
      evalCase,
      id: "audit-actions",
      passed: true,
      reason: "No audit action assertion is required for this eval case."
    });
  }

  const actual = response.auditEntries.map((entry) => entry.action);
  const missing = expected.filter((action) => !actual.includes(action));
  return makeFinding({
    evalCase,
    id: "audit-actions",
    passed: missing.length === 0,
    reason: missing.length === 0 ? "Required audit actions were recorded." : `Missing audit actions: ${missing.join(", ")}.`,
    diff: {
      expected,
      actual,
      missing
    }
  });
}

export function scoreEvalResponse(evalCase: EvalCase, response: AnalyzePipelineResponse): EvalResult {
  const severity = scoreSeverity({ evalCase, response });
  const category = scoreCategory({ evalCase, response });
  const evidence = scoreEvidence({ evalCase, response });
  const safety = scoreSafety({ evalCase, response });
  const recommendation = scoreRecommendations({ evalCase, response });
  const structure = scoreStructure({ evalCase, response });
  const scoreWithoutTotal: Omit<EvalScore, "totalScore"> = {
    severityScore: severity.score,
    categoryScore: category.score,
    evidenceScore: evidence.score,
    safetyScore: safety.score,
    recommendationScore: recommendation.score,
    structureScore: structure.score
  };
  const totalScore = normalizedWeightedScore({ ...scoreWithoutTotal, totalScore: 0 }, evalCase.scoringRubric.weights);
  const auditFinding = scoreAuditActions(evalCase, response);
  const score: EvalScore = {
    ...scoreWithoutTotal,
    totalScore
  };
  const findings = [
    ...severity.findings,
    ...category.findings,
    ...evidence.findings,
    ...safety.findings,
    ...recommendation.findings,
    ...structure.findings,
    auditFinding
  ];
  const passed =
    totalScore >= evalCase.scoringRubric.minTotalScore &&
    safety.score >= evalCase.scoringRubric.requiredSafetyScore &&
    evidence.score >= evalCase.scoringRubric.requiredEvidenceScore &&
    structure.score === 1 &&
    auditFinding.passed;

  const result = response.result;
  const reasoning = result?.reasoning;
  return {
    evalCaseId: evalCase.id,
    category: evalCase.category,
    domain: evalCase.domain,
    riskClass: evalCase.riskClass,
    featureArea: evalCase.featureArea,
    allowed: response.allowed,
    passed,
    score,
    findings,
    observed: {
      title: result?.title,
      severity: result?.severity,
      category: result?.category,
      evidenceCount: result?.evidence.length ?? 0,
      recommendationCount: result?.recommendedActions.length ?? 0,
      timelineCount: result?.timeline.length ?? 0,
      timelineLabels: result?.timeline.map((event) => event.label) ?? [],
      findingTitles: reasoning?.findings.map((finding) => finding.title) ?? [],
      indicatorCount: result?.indicators.length ?? 0,
      auditActions: response.auditEntries.map((entry) => entry.action)
    },
    caseId: response.caseId
  };
}
