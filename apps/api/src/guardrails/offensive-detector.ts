import type { AnalysisMode } from "../schemas/input.schema";
import type { SafetyDecision } from "../schemas/safety.schema";
import { evaluateSafetyPolicy } from "../safety/policy-engine";

export type { SafetyDecision };

export function detectOffensiveRequest(input: { mode: AnalysisMode; text: string }): SafetyDecision {
  return evaluateSafetyPolicy(input);
}
