import type { Finding, Hypothesis, Observation, ReasoningBundle } from "../schemas/reasoning.schema";
import { reasoningBundleSchema } from "../schemas/reasoning.schema";

export interface ReasoningValidationResult {
  valid: boolean;
  issues: string[];
}

export interface ProviderOutputSafetyResult {
  allowed: boolean;
  reason?: string;
}

const unsafeOutputPatterns: Array<[string, RegExp]> = [
  ["exploit_or_payload_instructions", /\b(exploit chain|weaponized payload|reverse shell|shellcode|dropper|stager)\b/i],
  ["malware_or_ransomware_logic", /\b(write|create|generate|build|modify)\b.{0,80}\b(malware|ransomware|trojan|keylogger|rootkit)\b/i],
  ["credential_theft_workflow", /\b(steal|dump|harvest|exfiltrate)\b.{0,80}\b(credentials?|passwords?|tokens?|cookies?|hashes?)\b/i],
  ["persistence_or_evasion", /\b(persistence|bypass edr|bypass antivirus|evade detection|disable defender)\b/i],
  ["unauthorized_intrusion", /\b(break into|compromise the target|gain unauthorized access)\b/i]
];

function duplicateIds(items: Array<{ id: string }>): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }
    seen.add(item.id);
  }

  return [...duplicates];
}

function validateHypothesisRefs(hypotheses: Hypothesis[], observationIds: Set<string>, issues: string[]): void {
  for (const hypothesis of hypotheses) {
    for (const observationId of [...hypothesis.supportingObservationIds, ...hypothesis.contradictingObservationIds]) {
      if (!observationIds.has(observationId)) {
        issues.push(`Hypothesis ${hypothesis.id} references missing observation ${observationId}.`);
      }
    }

    if (hypothesis.status === "supported" && hypothesis.supportingObservationIds.length === 0) {
      issues.push(`Supported hypothesis ${hypothesis.id} must cite supporting observations.`);
    }
  }
}

function validateFindingRefs(findings: Finding[], observationIds: Set<string>, issues: string[]): void {
  for (const finding of findings) {
    for (const observationId of finding.evidenceObservationIds) {
      if (!observationIds.has(observationId)) {
        issues.push(`Finding ${finding.id} references missing observation ${observationId}.`);
      }
    }

    if ((finding.severity === "high" || finding.severity === "critical") && finding.evidenceObservationIds.length === 0) {
      issues.push(`High-impact finding ${finding.id} must cite at least one observation.`);
    }
  }
}

export function validateReasoningBundle(bundle: ReasoningBundle): ReasoningValidationResult {
  const issues: string[] = [];
  const parsed = reasoningBundleSchema.safeParse(bundle);

  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    };
  }

  const observationDuplicates = duplicateIds(parsed.data.observations);
  const hypothesisDuplicates = duplicateIds(parsed.data.hypotheses);
  const findingDuplicates = duplicateIds(parsed.data.findings);
  const runDuplicates = duplicateIds(parsed.data.reasoningRuns);

  for (const id of observationDuplicates) {
    issues.push(`Duplicate observation id ${id}.`);
  }
  for (const id of hypothesisDuplicates) {
    issues.push(`Duplicate hypothesis id ${id}.`);
  }
  for (const id of findingDuplicates) {
    issues.push(`Duplicate finding id ${id}.`);
  }
  for (const id of runDuplicates) {
    issues.push(`Duplicate reasoning run id ${id}.`);
  }

  const observationIds = new Set(parsed.data.observations.map((observation: Observation) => observation.id));
  validateHypothesisRefs(parsed.data.hypotheses, observationIds, issues);
  validateFindingRefs(parsed.data.findings, observationIds, issues);

  return {
    valid: issues.length === 0,
    issues
  };
}

export function validateProviderOutputSafety(output: string): ProviderOutputSafetyResult {
  const matched = unsafeOutputPatterns.find(([, pattern]) => pattern.test(output));

  if (!matched) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: matched[0]
  };
}
