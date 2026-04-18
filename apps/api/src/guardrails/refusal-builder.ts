import type { Refusal } from "../schemas/result.schema";
import type { SafetyDecision } from "../schemas/safety.schema";

export function buildRefusal(matchedSignalsOrDecision: string[] | SafetyDecision): Refusal {
  const decision = Array.isArray(matchedSignalsOrDecision) ? undefined : matchedSignalsOrDecision;
  const matchedSignals = Array.isArray(matchedSignalsOrDecision)
    ? matchedSignalsOrDecision
    : matchedSignalsOrDecision.matchedSignals;

  return {
    allowed: false,
    reason: decision?.reason === "scope_clarification_required" ? "scope_clarification_required" : "offensive_request_detected",
    safeRedirect:
      decision?.safeRedirect ??
      "I can help you analyze alerts, improve detections, harden systems, validate controls safely, or draft an incident response plan instead.",
    matchedSignals
  };
}
