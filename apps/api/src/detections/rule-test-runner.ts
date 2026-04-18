import type { DetectionRule, RuleTestCase, RuleTestResult, RuleValidationResult } from "../schemas/detections.schema";
import { detectionRuleSchema } from "../schemas/detections.schema";
import { nowIso } from "../utils/time";

const unsafeDetectionPatterns: Array<[string, RegExp]> = [
  ["payload_or_shell", /\b(reverse shell|shellcode|payload|stager|dropper)\b/i],
  ["credential_theft", /\b(steal|dump|harvest|exfiltrate)\b.{0,80}\b(credentials?|passwords?|tokens?|hashes?)\b/i],
  ["evasion", /\b(bypass edr|bypass antivirus|evade detection|disable defender)\b/i]
];

function getPathValue(value: Record<string, unknown>, path: string): unknown {
  const aliases: Record<string, string[]> = {
    "process.image": ["process.image", "process", "image"],
    "process.commandLine": ["process.commandLine", "process.command_line", "commandLine", "command_line", "message"],
    "process.parentImage": ["process.parentImage", "parentProcess", "parent"],
    eventType: ["eventType", "event_type", "event", "message"],
    srcIp: ["srcIp", "src", "source.ip"],
    user: ["user", "username", "actor"],
    host: ["host", "hostname", "asset"]
  };
  const paths = aliases[path] ?? [path];

  for (const candidate of paths) {
    const parts = candidate.split(".");
    let current: unknown = value;
    for (const part of parts) {
      if (typeof current !== "object" || current === null || !(part in current)) {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (current !== undefined) {
      return current;
    }
  }

  return undefined;
}

export function eventMatchesSelection(event: Record<string, unknown>, selection: Record<string, string[]>): boolean {
  return Object.entries(selection).every(([field, expectedValues]) => {
    const actual = getPathValue(event, field);
    const actualText = typeof actual === "string" || typeof actual === "number" ? String(actual).toLowerCase() : "";
    return expectedValues.some((expected) => actualText.includes(expected.toLowerCase()));
  });
}

function validateSchema(rule: DetectionRule): string[] {
  const warnings: string[] = [];
  const parsed = detectionRuleSchema.safeParse(rule);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  }

  if (Object.keys(rule.logic.detection.selection).length === 0) {
    warnings.push("Detection selection must not be empty.");
  }

  if (!rule.logic.logsource.product || !rule.logic.logsource.category) {
    warnings.push("Rule must include logsource product and category.");
  }

  const serialized = JSON.stringify(rule);
  for (const [name, pattern] of unsafeDetectionPatterns) {
    if (pattern.test(serialized)) {
      warnings.push(`Unsafe detection content matched ${name}.`);
    }
  }

  return warnings;
}

export function validateDetectionRule(rule: DetectionRule): RuleValidationResult {
  const warnings = validateSchema(rule);

  return {
    id: `validation_${rule.id}`,
    ruleId: rule.id,
    schemaStatus: warnings.length === 0 ? "passed" : "failed",
    fixtureStatus: "not_run",
    warnings,
    passed: warnings.length === 0,
    testResults: [],
    createdAt: nowIso()
  };
}

export function runRuleTests(rule: DetectionRule, testCases: RuleTestCase[]): RuleValidationResult {
  const schemaValidation = validateDetectionRule(rule);
  const testResults: RuleTestResult[] = testCases.map((testCase) => {
    const actualMatch = eventMatchesSelection(testCase.event, rule.logic.detection.selection);
    return {
      testCaseId: testCase.id,
      expectedMatch: testCase.expectedMatch,
      actualMatch,
      passed: actualMatch === testCase.expectedMatch,
      reason: testCase.reason
    };
  });
  const fixturePassed = testResults.every((result) => result.passed);

  return {
    ...schemaValidation,
    fixtureStatus: fixturePassed ? "passed" : "failed",
    passed: schemaValidation.passed && fixturePassed,
    testResults,
    createdAt: nowIso()
  };
}
