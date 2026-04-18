import type { AnalysisResult } from "../schemas/result.schema";
import type { ReasoningBundle } from "../schemas/reasoning.schema";
import type { CyberReasoningV2 } from "../schemas/reasoning-v2.schema";
import { mapAttackTechniques } from "./attack-mapping-service";
import { detectReasoningContradictions } from "./contradiction-detector";
import { scoreFindingEvidence } from "./evidence-support-service";
import { buildHypothesisGraph } from "./hypothesis-graph-service";
import { buildUnknownRecords } from "./unknowns-service";

export function buildCyberReasoningV2(input: { result: AnalysisResult; reasoning: ReasoningBundle }): CyberReasoningV2 {
  const supportScores = scoreFindingEvidence(input.reasoning.findings, input.reasoning.observations);
  const weakFindingIds = new Set(supportScores.filter((score) => score.status !== "supported").map((score) => score.findingId));
  const hypothesisNodes = buildHypothesisGraph(input.reasoning.hypotheses, input.reasoning.observations).map((node) => ({
    ...node,
    reviewStatus: weakFindingIds.size > 0 || node.status !== "supported" ? "unreviewed" : node.reviewStatus
  }));

  return {
    hypothesisNodes,
    contradictions: detectReasoningContradictions({
      result: input.result,
      observations: input.reasoning.observations
    }),
    unknownRecords: buildUnknownRecords(input.reasoning.unknowns),
    techniqueMappings: mapAttackTechniques(input.result, input.reasoning.observations),
    reviews: []
  };
}
