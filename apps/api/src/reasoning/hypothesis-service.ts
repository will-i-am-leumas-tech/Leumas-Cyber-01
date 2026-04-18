import type { AnalysisResult } from "../schemas/result.schema";
import type { Hypothesis, Observation } from "../schemas/reasoning.schema";

type AnalysisForReasoning = Omit<AnalysisResult, "reportMarkdown" | "reasoning">;

function baseAssumptions(): string[] {
  return [
    "Submitted telemetry accurately represents the relevant time window.",
    "Parsed fields and timestamps were not intentionally altered before submission."
  ];
}

function unknownsForCategory(category: string, severity: string): string[] {
  const unknowns = [
    "Whether the observed activity was authorized by the system owner.",
    "Whether related activity exists elsewhere in the environment."
  ];

  if (severity === "high" || severity === "critical") {
    unknowns.push("Full blast radius and affected assets are not yet confirmed.");
  }

  if (category === "indicator-review") {
    unknowns.push("External reputation and internal sightings have not been enriched by connected tools.");
  }

  if (category === "hardening") {
    unknowns.push("Current control state has not been verified by scanner or configuration data.");
  }

  return unknowns;
}

export function buildHypotheses(result: AnalysisForReasoning, observations: Observation[]): Hypothesis[] {
  const factObservationIds = observations
    .filter((observation) => observation.type === "fact" || observation.type === "timeline_event")
    .map((observation) => observation.id);
  const supportingObservationIds = factObservationIds.length > 0 ? factObservationIds : observations.slice(0, 1).map((observation) => observation.id);
  const noClearPattern = result.evidence.some((evidence) => evidence.toLowerCase().startsWith("no high-confidence"));

  return [
    {
      id: "hypothesis_001",
      title: noClearPattern ? "No high-confidence malicious pattern identified" : `Likely ${result.category} activity`,
      status: noClearPattern || result.confidence < 0.7 ? "needs_review" : "supported",
      confidence: Math.max(0.2, Math.min(0.98, result.confidence)),
      reasoningSummary: noClearPattern
        ? "The submitted evidence did not match a strong suspicious pattern, so the case should be reviewed with more telemetry before firm conclusions are made."
        : `The submitted evidence supports a ${result.category} assessment with ${result.severity} severity.`,
      supportingObservationIds,
      contradictingObservationIds: [],
      assumptions: baseAssumptions(),
      unknowns: unknownsForCategory(result.category, result.severity)
    }
  ];
}
