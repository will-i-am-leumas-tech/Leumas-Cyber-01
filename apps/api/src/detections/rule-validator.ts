import { detectionRuleV2Schema, type DetectionRuleValidationV2, type DetectionRuleV2 } from "../schemas/detections-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { getRuleFormat } from "./rule-format-registry";

const unsafeDetectionPatterns: Array<[string, RegExp]> = [
  ["payload_or_shell", /\b(reverse shell|shellcode|payload|stager|dropper)\b/i],
  ["credential_theft", /\b(steal|dump|harvest|exfiltrate)\b.{0,80}\b(credentials?|passwords?|tokens?|hashes?)\b/i],
  ["evasion", /\b(bypass edr|bypass antivirus|evade detection|disable defender)\b/i],
  ["destructive_action", /\b(delete logs|disable logging|wipe|destroy evidence)\b/i]
];

function validateSyntax(rule: DetectionRuleV2): string[] {
  const warnings: string[] = [];
  const parsed = detectionRuleV2Schema.safeParse(rule);
  if (!parsed.success) {
    warnings.push(...parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
  }

  if (!getRuleFormat(rule.format)) {
    warnings.push(`Unsupported rule format: ${rule.format}.`);
  }

  if (rule.content.trim().length === 0) {
    warnings.push("Rule content must not be empty.");
  }

  if (rule.format === "kql" && !/\|\s*where\b/i.test(rule.content)) {
    warnings.push("KQL rule must include a where clause.");
  }
  if (rule.format === "spl" && !/\b(?:index=|search)\b/i.test(rule.content)) {
    warnings.push("SPL rule must include a search scope.");
  }
  if (rule.format === "yara" && !/\brule\s+[A-Za-z0-9_]+\s*\{/i.test(rule.content)) {
    warnings.push("YARA rule must include a rule declaration.");
  }
  if (rule.metadata.evidenceIds.length === 0) {
    warnings.push("Rule metadata must include at least one evidence id or evidence ref.");
  }

  return warnings;
}

function validateSafety(rule: DetectionRuleV2): string[] {
  const serialized = JSON.stringify(rule);
  return unsafeDetectionPatterns
    .filter(([, pattern]) => pattern.test(serialized))
    .map(([name]) => `Unsafe detection content matched ${name}.`);
}

export function validateRuleV2(rule: DetectionRuleV2): DetectionRuleValidationV2 {
  const syntaxWarnings = validateSyntax(rule);
  const safetyWarnings = validateSafety(rule);
  const warnings = [...syntaxWarnings, ...safetyWarnings];

  return {
    id: createId("rule_validation_v2"),
    ruleId: rule.id,
    format: rule.format,
    syntaxStatus: syntaxWarnings.length === 0 ? "passed" : "failed",
    safetyStatus: safetyWarnings.length === 0 ? "passed" : "failed",
    backendStatus: "not_run",
    warnings,
    passed: warnings.length === 0,
    createdAt: nowIso()
  };
}
