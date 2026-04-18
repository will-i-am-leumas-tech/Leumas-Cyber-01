import type { AuthorizationScope, CreateAuthorizationScopeInput } from "../schemas/validation.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface ScopePolicyResult {
  allowed: boolean;
  reason?: string;
  warnings: string[];
}

export function buildAuthorizationScope(input: CreateAuthorizationScopeInput): AuthorizationScope {
  return {
    id: createId("validation_scope"),
    name: input.name,
    assets: input.assets,
    owners: input.owners,
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    approvers: input.approvers,
    allowedTestTypes: input.allowedTestTypes,
    exclusions: input.exclusions,
    createdAt: nowIso()
  };
}

export function isScopeCurrent(scope: AuthorizationScope, at = nowIso()): boolean {
  return scope.startsAt <= at && scope.expiresAt >= at;
}

export function evaluateScopeForCampaign(scope: AuthorizationScope | undefined, at = nowIso()): ScopePolicyResult {
  if (!scope) {
    return {
      allowed: false,
      reason: "authorization_scope_missing",
      warnings: ["Validation planning requires an explicit authorization scope."]
    };
  }

  if (!isScopeCurrent(scope, at)) {
    return {
      allowed: false,
      reason: "authorization_scope_expired_or_not_started",
      warnings: [`Scope ${scope.id} is not current for ${at}.`]
    };
  }

  if (scope.approvers.length === 0 || scope.owners.length === 0 || scope.assets.length === 0) {
    return {
      allowed: false,
      reason: "authorization_scope_incomplete",
      warnings: ["Scope must include assets, owners, and approvers."]
    };
  }

  return {
    allowed: true,
    warnings: scope.exclusions.map((exclusion) => `Excluded from validation: ${exclusion}`)
  };
}
