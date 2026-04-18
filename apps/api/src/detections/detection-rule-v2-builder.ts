import type { DetectionIntent, DetectionRule } from "../schemas/detections.schema";
import { detectionRuleV2Schema, type DetectionRuleFormat, type DetectionRuleV2 } from "../schemas/detections-v2.schema";
import { nowIso } from "../utils/time";
import { translateRuleToKql } from "./kql-query-translator";
import { translateRuleToSpl } from "./spl-query-translator";
import { buildYaraRule } from "./yara-rule-builder";

function attackTechniquesForIntent(intent: DetectionIntent): string[] {
  if (intent.category === "execution") {
    return ["T1059 Command and Scripting Interpreter"];
  }
  if (intent.category === "credential-access") {
    return ["T1110 Brute Force"];
  }
  return [intent.category];
}

function contentForFormat(format: DetectionRuleFormat, rule: DetectionRule, intent: DetectionIntent): string {
  if (format === "kql") {
    return translateRuleToKql(rule);
  }
  if (format === "spl") {
    return translateRuleToSpl(rule);
  }
  if (format === "yara") {
    return buildYaraRule(intent, rule);
  }
  return rule.exportText;
}

export function buildDetectionRuleV2Variants(input: {
  intent: DetectionIntent;
  rule: DetectionRule;
  indexStart?: number;
}): DetectionRuleV2[] {
  const createdAt = nowIso();
  const formats: DetectionRuleFormat[] = ["sigma-like-json", "kql", "spl", "yara"];

  return formats.map((format, index) =>
    detectionRuleV2Schema.parse({
      id: `detection_rule_v2_${String((input.indexStart ?? 0) + index + 1).padStart(3, "0")}`,
      sourceRuleId: input.rule.id,
      intentId: input.intent.id,
      format,
      content: contentForFormat(format, input.rule, input.intent),
      metadata: {
        title: input.rule.title,
        description: input.rule.logic.description,
        severity: input.rule.logic.level,
        evidenceIds: input.intent.evidenceRefs,
        attackTechniques: attackTechniquesForIntent(input.intent),
        dataSources: input.intent.dataSources,
        createdAt
      },
      status: "draft",
      validationIds: [],
      corpusItemIds: [],
      deploymentIds: [],
      createdAt,
      updatedAt: createdAt
    })
  );
}
