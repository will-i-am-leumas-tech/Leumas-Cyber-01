import type { Permission, PermissionAction, PermissionResource, Role, RoleId } from "../schemas/auth.schema";
import { evaluateAccessPolicy } from "./authorization-policy-engine";

export const roles: Role[] = [
  { id: "viewer", displayName: "Viewer", description: "Read assigned cases." },
  { id: "analyst", displayName: "Analyst", description: "Create and update assigned cases." },
  { id: "lead", displayName: "Lead", description: "Manage assigned cases and approvals." },
  { id: "responder", displayName: "Responder", description: "Execute approved tools and actions." },
  { id: "admin", displayName: "Admin", description: "Manage users, cases, and system settings." },
  { id: "auditor", displayName: "Auditor", description: "Read audit and governance evidence." }
];

export const rolePermissions: Permission[] = [
  { role: "viewer", resource: "case", action: "read", condition: "case_member" },
  { role: "viewer", resource: "tool", action: "read", condition: "case_member" },
  { role: "viewer", resource: "action", action: "read", condition: "case_member" },
  { role: "analyst", resource: "case", action: "create", condition: "global" },
  { role: "analyst", resource: "case", action: "read", condition: "case_member" },
  { role: "analyst", resource: "case", action: "write", condition: "case_member" },
  { role: "analyst", resource: "tool", action: "read", condition: "case_member" },
  { role: "analyst", resource: "action", action: "read", condition: "case_member" },
  { role: "lead", resource: "case", action: "manage", condition: "case_member" },
  { role: "lead", resource: "tool", action: "read", condition: "case_member" },
  { role: "lead", resource: "action", action: "read", condition: "case_member" },
  { role: "lead", resource: "action", action: "approve", condition: "case_member" },
  { role: "responder", resource: "tool", action: "read", condition: "case_member" },
  { role: "responder", resource: "tool", action: "execute", condition: "case_member" },
  { role: "responder", resource: "action", action: "read", condition: "case_member" },
  { role: "responder", resource: "action", action: "execute", condition: "case_member" },
  { role: "admin", resource: "case", action: "manage", condition: "global" },
  { role: "admin", resource: "tool", action: "execute", condition: "global" },
  { role: "admin", resource: "action", action: "execute", condition: "global" },
  { role: "admin", resource: "audit", action: "read", condition: "global" },
  { role: "admin", resource: "system", action: "read", condition: "global" },
  { role: "admin", resource: "system", action: "manage", condition: "global" },
  { role: "auditor", resource: "case", action: "read", condition: "global" },
  { role: "auditor", resource: "audit", action: "read", condition: "global" },
  { role: "auditor", resource: "system", action: "read", condition: "global" }
];

export function permissionsForRoles(roleIds: RoleId[]): Permission[] {
  return rolePermissions.filter((permission) => roleIds.includes(permission.role));
}

export function hasPermission(input: {
  roles: RoleId[];
  resource: PermissionResource;
  action: PermissionAction;
  caseMember?: boolean;
}): boolean {
  return evaluateAccessPolicy({
    subjectId: "local-permission-check",
    subjectType: "user",
    tenantIds: ["tenant_default"],
    activeTenantId: "tenant_default",
    permissions: permissionsForRoles(input.roles),
    resource: input.resource,
    action: input.action,
    caseMember: input.caseMember
  }).allowed;
}
