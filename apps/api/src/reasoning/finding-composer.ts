import type { AnalysisResult } from "../schemas/result.schema";
import type { Finding, Hypothesis, Observation } from "../schemas/reasoning.schema";

type AnalysisForReasoning = Omit<AnalysisResult, "reportMarkdown" | "reasoning">;

function evidenceObservationIdsForFinding(result: AnalysisForReasoning, observations: Observation[]): string[] {
  const preferred = observations
    .filter((observation) => observation.type === "fact" || observation.type === "timeline_event")
    .map((observation) => observation.id);

  if (preferred.length > 0) {
    return preferred;
  }

  if (result.severity === "high" || result.severity === "critical") {
    return observations.slice(0, 1).map((observation) => observation.id);
  }

  return observations.filter((observation) => observation.type !== "analyst_note").slice(0, 3).map((observation) => observation.id);
}

export function composeFindings(
  result: AnalysisForReasoning,
  observations: Observation[],
  hypotheses: Hypothesis[]
): Finding[] {
  const primaryHypothesis = hypotheses[0];
  const evidenceObservationIds = evidenceObservationIdsForFinding(result, observations);

  return [
    {
      id: "finding_001",
      title: result.title,
      severity: result.severity,
      category: result.category,
      confidence: Math.max(0.2, Math.min(0.98, result.confidence)),
      reasoningSummary: primaryHypothesis?.reasoningSummary ?? result.summary,
      evidenceObservationIds,
      recommendations: result.recommendedActions,
      needsAnalystReview: result.confidence < 0.75 || result.severity === "high" || result.severity === "critical"
    }
  ];
}
