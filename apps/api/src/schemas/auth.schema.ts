import { z } from "zod";

export const userStatusSchema = z.enum(["active", "disabled"]);
export const roleIdSchema = z.enum(["viewer", "analyst", "lead", "responder", "admin", "auditor"]);
export const permissionResourceSchema = z.enum(["case", "tool", "action", "audit", "system"]);
export const permissionActionSchema = z.enum(["create", "read", "write", "execute", "approve", "manage"]);

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  status: userStatusSchema,
  tenantIds: z.array(z.string()).default(["tenant_default"]),
  attributes: z.record(z.string()).default({}),
  groups: z.array(z.string()).default([]),
  teamIds: z.array(z.string()).default([]),
  roles: z.array(roleIdSchema).default(["viewer"])
});

export const roleSchema = z.object({
  id: roleIdSchema,
  displayName: z.string(),
  description: z.string()
});

export const permissionSchema = z.object({
  role: roleIdSchema,
  resource: permissionResourceSchema,
  action: permissionActionSchema,
  condition: z.enum(["global", "case_member", "assigned"]).default("global")
});

export const teamSchema = z.object({
  id: z.string(),
  name: z.string()
});

export const caseMembershipSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  userId: z.string(),
  role: roleIdSchema,
  teamId: z.string().optional(),
  createdAt: z.string()
});

export const authContextSchema = z.object({
  user: userSchema,
  roles: z.array(roleIdSchema),
  permissions: z.array(permissionSchema),
  tenantIds: z.array(z.string()).default(["tenant_default"]),
  activeTenantId: z.string().default("tenant_default"),
  attributes: z.record(z.string()).default({}),
  scopes: z.array(z.string()).default([]),
  activeBreakGlassTenantIds: z.array(z.string()).default([]),
  serviceAccountId: z.string().optional(),
  requestId: z.string()
});

export type UserStatus = z.infer<typeof userStatusSchema>;
export type RoleId = z.infer<typeof roleIdSchema>;
export type PermissionResource = z.infer<typeof permissionResourceSchema>;
export type PermissionAction = z.infer<typeof permissionActionSchema>;
export type User = z.infer<typeof userSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type Team = z.infer<typeof teamSchema>;
export type CaseMembership = z.infer<typeof caseMembershipSchema>;
export type AuthContext = z.infer<typeof authContextSchema>;
