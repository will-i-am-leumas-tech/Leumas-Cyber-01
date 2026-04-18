import type { AuthorizedScopeV2 } from "../schemas/validation-v2.schema";
import { nowIso } from "../utils/time";
import { verifyScopeV2Signature } from "./scope-v2-service";

export interface TargetScopeDecision {
  allowed: boolean;
  reason?: string;
  warnings: string[];
}

function targetMatches(pattern: string, target: string): boolean {
  if (pattern === target) {
    return true;
  }
  if (pattern.startsWith("*.")) {
    return target.endsWith(pattern.slice(1));
  }
  return false;
}

export function evaluateTargetScope(input: { scope?: AuthorizedScopeV2; target: string; at?: string }): TargetScopeDecision {
  const at = input.at ?? nowIso();
  if (!input.scope) {
    return {
      allowed: false,
      reason: "validation_scope_missing",
      warnings: ["Validation requires an approved scope v2 record."]
    };
  }

  if (!verifyScopeV2Signature(input.scope)) {
    return {
      allowed: false,
      reason: "validation_scope_signature_invalid",
      warnings: ["Scope signature did not match approved scope fields."]
    };
  }

  if (input.scope.startsAt > at || input.scope.expiresAt < at) {
    return {
      allowed: false,
      reason: "validation_scope_not_current",
      warnings: [`Scope ${input.scope.id} is not current for ${at}.`]
    };
  }

  if (input.scope.targetDenylist.some((pattern) => targetMatches(pattern, input.target))) {
    return {
      allowed: false,
      reason: "target_denied",
      warnings: [`Target ${input.target} matched the scope denylist.`]
    };
  }

  if (!input.scope.targetAllowlist.some((pattern) => targetMatches(pattern, input.target))) {
    return {
      allowed: false,
      reason: "target_not_allowlisted",
      warnings: [`Target ${input.target} was not present in the scope allowlist.`]
    };
  }

  return {
    allowed: true,
    warnings: []
  };
}
