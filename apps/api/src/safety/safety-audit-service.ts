import type { OutputSafetyResult, PromptInjectionFinding, SafetyDecision } from "../schemas/safety.schema";

export function safetyDecisionMetadata(decision: SafetyDecision): Record<string, unknown> {
  return {
    safetyDecisionId: decision.id,
    category: decision.category,
    reason: decision.reason,
    matchedSignals: decision.matchedSignals,
    policyVersion: decision.policyVersion
  };
}

export function promptInjectionMetadata(findings: PromptInjectionFinding[]): Record<string, unknown> {
  return {
    findingCount: findings.length,
    risks: findings.map((finding) => finding.risk),
    patterns: findings.map((finding) => finding.pattern)
  };
}

export function outputSafetyMetadata(result: OutputSafetyResult): Record<string, unknown> {
  return {
    outputSafetyId: result.id,
    allowed: result.allowed,
    blockedSegments: result.blockedSegments,
    reason: result.reason,
    policyVersion: result.policyVersion
  };
}
