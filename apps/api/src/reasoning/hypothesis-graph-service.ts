import type { Hypothesis, Observation } from "../schemas/reasoning.schema";
import type { HypothesisNode } from "../schemas/reasoning-v2.schema";

export function buildHypothesisGraph(hypotheses: Hypothesis[], observations: Observation[]): HypothesisNode[] {
  const observationIds = new Set(observations.map((observation) => observation.id));
  return hypotheses.map((hypothesis, index) => ({
    id: `hypothesis_node_${String(index + 1).padStart(3, "0")}`,
    title: hypothesis.title,
    description: hypothesis.reasoningSummary,
    status: hypothesis.status,
    confidence: hypothesis.confidence,
    evidenceObservationIds: hypothesis.supportingObservationIds.filter((id) => observationIds.has(id)),
    counterEvidenceObservationIds: hypothesis.contradictingObservationIds.filter((id) => observationIds.has(id)),
    childIds: [],
    reviewStatus: hypothesis.status === "supported" && hypothesis.confidence >= 0.8 ? "approved" : "unreviewed"
  }));
}
