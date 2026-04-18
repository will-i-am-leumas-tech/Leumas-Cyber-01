import type { DetectionRule, RuleTestCase } from "../schemas/detections.schema";
import {
  corpusRunResultSchema,
  detectionCorpusItemSchema,
  type CorpusRunResult,
  type DetectionCorpusItem
} from "../schemas/detections-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { eventMatchesSelection } from "./rule-test-runner";

export function corpusItemFromRuleTestCase(testCase: RuleTestCase): DetectionCorpusItem {
  return detectionCorpusItemSchema.parse({
    id: createId("corpus_item"),
    label: testCase.expectedMatch ? "positive" : "negative",
    source: testCase.name,
    expectedMatch: testCase.expectedMatch,
    eventData: testCase.event,
    tags: [testCase.reason],
    createdAt: nowIso()
  });
}

export function buildCorpusItems(items: Array<Omit<DetectionCorpusItem, "id" | "createdAt">>): DetectionCorpusItem[] {
  return items.map((item) =>
    detectionCorpusItemSchema.parse({
      ...item,
      id: createId("corpus_item"),
      createdAt: nowIso()
    })
  );
}

export function runDetectionCorpus(rule: DetectionRule, corpusItems: DetectionCorpusItem[]): CorpusRunResult {
  const results = corpusItems.map((item) => {
    const actualMatch = eventMatchesSelection(item.eventData, rule.logic.detection.selection);
    return {
      corpusItemId: item.id,
      expectedMatch: item.expectedMatch,
      actualMatch,
      passed: actualMatch === item.expectedMatch,
      reason: item.tags[0] ?? item.source
    };
  });

  return corpusRunResultSchema.parse({
    id: createId("corpus_run"),
    ruleId: rule.id,
    passed: results.every((result) => result.passed),
    results,
    createdAt: nowIso()
  });
}
