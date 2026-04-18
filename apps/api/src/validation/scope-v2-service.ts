import {
  authorizedScopeV2Schema,
  createAuthorizedScopeV2Schema,
  type AuthorizedScopeV2,
  type CreateAuthorizedScopeV2Input
} from "../schemas/validation-v2.schema";
import { sha256Text } from "../reasoning/hash";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

function scopeSignaturePayload(input: Omit<AuthorizedScopeV2, "id" | "signature" | "createdAt">): string {
  return JSON.stringify({
    name: input.name,
    owner: input.owner,
    approver: input.approver,
    targetAllowlist: [...input.targetAllowlist].sort(),
    targetDenylist: [...input.targetDenylist].sort(),
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    labMode: input.labMode,
    approvedTemplateIds: [...input.approvedTemplateIds].sort()
  });
}

export function signScopeV2(input: Omit<AuthorizedScopeV2, "id" | "signature" | "createdAt">): string {
  return sha256Text(scopeSignaturePayload(input));
}

export function buildAuthorizedScopeV2(input: CreateAuthorizedScopeV2Input): AuthorizedScopeV2 {
  const parsed = createAuthorizedScopeV2Schema.parse(input);
  const unsigned = {
    name: parsed.name,
    owner: parsed.owner,
    approver: parsed.approver,
    targetAllowlist: parsed.targetAllowlist,
    targetDenylist: parsed.targetDenylist,
    startsAt: parsed.startsAt,
    expiresAt: parsed.expiresAt,
    labMode: parsed.labMode,
    approvedTemplateIds: parsed.approvedTemplateIds
  };

  return authorizedScopeV2Schema.parse({
    ...unsigned,
    id: createId("validation_scope_v2"),
    signature: signScopeV2(unsigned),
    createdAt: nowIso()
  });
}

export function verifyScopeV2Signature(scope: AuthorizedScopeV2): boolean {
  return (
    signScopeV2({
      name: scope.name,
      owner: scope.owner,
      approver: scope.approver,
      targetAllowlist: scope.targetAllowlist,
      targetDenylist: scope.targetDenylist,
      startsAt: scope.startsAt,
      expiresAt: scope.expiresAt,
      labMode: scope.labMode,
      approvedTemplateIds: scope.approvedTemplateIds
    }) === scope.signature
  );
}
