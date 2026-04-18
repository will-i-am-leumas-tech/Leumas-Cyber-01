import type { CaseMembership, PermissionAction, RoleId, User } from "../schemas/auth.schema";
import { hasPermission } from "./permission-service";

export function userMembershipForCase(user: User, caseId: string, memberships: CaseMembership[]): CaseMembership | undefined {
  return memberships.find((membership) => membership.caseId === caseId && membership.userId === user.id);
}

export function canAccessCase(input: {
  user: User;
  roles: RoleId[];
  caseId: string;
  memberships: CaseMembership[];
  action: PermissionAction;
  caseTenantId?: string;
  activeBreakGlassTenantIds?: string[];
}): boolean {
  if (
    input.caseTenantId &&
    !input.user.tenantIds.includes(input.caseTenantId) &&
    !input.activeBreakGlassTenantIds?.includes(input.caseTenantId)
  ) {
    return false;
  }
  const membership = userMembershipForCase(input.user, input.caseId, input.memberships);
  const roles = membership ? [...new Set([...input.roles, membership.role])] : input.roles;
  return hasPermission({
    roles,
    resource: "case",
    action: input.action,
    caseMember: Boolean(membership)
  });
}
