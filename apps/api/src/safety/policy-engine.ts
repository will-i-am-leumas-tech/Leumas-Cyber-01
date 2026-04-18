import type { AnalysisMode } from "../schemas/input.schema";
import type { PolicyVersionRecord, SafetyDecision, SafetyReason } from "../schemas/safety.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { classifyCyberInput } from "./input-classifier";

export const safetyPolicyVersion = "safety-policy-2026-04-16.1";

export function activePolicyVersionRecord(): PolicyVersionRecord {
  return {
    version: safetyPolicyVersion,
    active: true,
    description: "Layered defensive cyber safety policy with input, prompt-injection, output, and tool enforcement hooks.",
    createdAt: "2026-04-16T00:00:00.000Z"
  };
}

const defaultDefensiveRedirect =
  "I can help with defensive analysis, detection engineering, hardening, incident response, or authorized control validation with clear scope.";

function reasonForCategory(category: SafetyDecision["category"], artifactAllowed: boolean): SafetyReason {
  if (artifactAllowed) {
    return "artifact_evidence_allowed";
  }
  if (category === "authorized_validation") {
    return "allowed_authorized_validation";
  }
  if (category === "lab") {
    return "allowed_lab";
  }
  if (category === "ambiguous") {
    return "scope_clarification_required";
  }
  if (category === "blocked") {
    return "offensive_request_detected";
  }
  return "allowed_defensive";
}

export function evaluateSafetyPolicy(input: { mode: AnalysisMode; text: string }): SafetyDecision {
  const classification = classifyCyberInput(input);
  const artifactAllowed =
    classification.category === "defensive" &&
    classification.looksLikeArtifact &&
    classification.harmfulSignals.length > 0;
  const allowed = classification.category !== "blocked" && classification.category !== "ambiguous";
  const reason = reasonForCategory(classification.category, artifactAllowed);
  const matchedSignals = [
    ...classification.harmfulSignals,
    ...classification.intentSignals,
    ...classification.contextSignals
  ];

  return {
    id: createId("safety_decision"),
    layer: "input",
    allowed,
    category: classification.category,
    reason,
    matchedSignals: [...new Set(matchedSignals)],
    safeRedirect: allowed
      ? undefined
      : classification.category === "ambiguous"
        ? "Please provide the authorized scope, target ownership, rules of engagement, and defensive objective before validation."
        : defaultDefensiveRedirect,
    policyVersion: safetyPolicyVersion,
    createdAt: nowIso()
  };
}
