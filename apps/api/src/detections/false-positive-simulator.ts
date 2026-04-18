import type { DetectionRule } from "../schemas/detections.schema";
import {
  falsePositiveSimulationResultSchema,
  type DetectionCorpusItem,
  type FalsePositiveSimulationResult
} from "../schemas/detections-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { eventMatchesSelection } from "./rule-test-runner";

export function simulateFalsePositives(rule: DetectionRule, corpusItems: DetectionCorpusItem[]): FalsePositiveSimulationResult {
  const benignItems = corpusItems.filter((item) => item.label === "benign" || item.expectedMatch === false);
  const matched = benignItems.filter((item) => eventMatchesSelection(item.eventData, rule.logic.detection.selection));
  const riskScore = benignItems.length === 0 ? 0 : matched.length / benignItems.length;
  const tuningSuggestions =
    riskScore === 0
      ? ["No benign corpus matches observed in this run."]
      : [
          "Review matching benign examples before deployment.",
          "Add environment-specific exclusions only when they preserve the suspicious behavior.",
          "Prefer narrowing fields or data sources over broad keyword removal."
        ];

  return falsePositiveSimulationResultSchema.parse({
    id: createId("false_positive_sim"),
    ruleId: rule.id,
    benignCorpusMatches: matched.length,
    benignCorpusTotal: benignItems.length,
    riskScore,
    matchedCorpusItemIds: matched.map((item) => item.id),
    tuningSuggestions,
    createdAt: nowIso()
  });
}
