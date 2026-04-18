import type { AnalysisResult } from "../schemas/result.schema";
import type { Observation } from "../schemas/reasoning.schema";
import type { ContradictionRecord } from "../schemas/reasoning-v2.schema";

const benignSignals = /\b(authorized|approved|expected|benign|known admin|change ticket|maintenance)\b/i;

export function detectReasoningContradictions(input: {
  result: AnalysisResult;
  observations: Observation[];
}): ContradictionRecord[] {
  const contradictions: ContradictionRecord[] = [];
  const benignObservations = input.observations.filter((observation) => benignSignals.test(observation.value));
  const unknownObservations = input.observations.filter((observation) => observation.type === "unknown");

  if ((input.result.severity === "high" || input.result.severity === "critical") && benignObservations.length > 0) {
    contradictions.push({
      id: "contradiction_001",
      sourceObservationIds: benignObservations.map((observation) => observation.id),
      conflictType: "source_conflict",
      explanation: "High-impact severity conflicts with evidence that may indicate authorized or benign activity.",
      severity: "high",
      resolutionStatus: "open"
    });
  }

  if ((input.result.severity === "high" || input.result.severity === "critical") && unknownObservations.length > 0) {
    contradictions.push({
      id: `contradiction_${String(contradictions.length + 1).padStart(3, "0")}`,
      sourceObservationIds: unknownObservations.map((observation) => observation.id),
      conflictType: "confidence_conflict",
      explanation: "High-impact severity is paired with unknown or low-confidence observations.",
      severity: "medium",
      resolutionStatus: "open"
    });
  }

  return contradictions;
}
