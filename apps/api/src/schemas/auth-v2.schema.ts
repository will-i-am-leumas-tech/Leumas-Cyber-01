import { z } from "zod";
import { permissionActionSchema, permissionResourceSchema, roleIdSchema } from "./auth.schema";

export const tenantStatusSchema = z.enum(["active", "suspended"]);

export const tenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: tenantStatusSchema,
  dataPolicy: z.string(),
  retentionPolicy: z.string(),
  createdAt: z.string()
});

export const identityPrincipalSchema = z.object({
  id: z.string(),
  subject: z.string(),
  email: z.string().email(),
  tenantIds: z.array(z.string()).default([]),
  roles: z.array(roleIdSchema).default(["viewer"]),
  attributes: z.record(z.string()).default({}),
  groups: z.array(z.string()).default([]),
  provider: z.enum(["dev", "oidc", "service-account"])
});

export const serviceAccountSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  owner: z.string(),
  scopes: z.array(z.string()).default([]),
  tokenHash: z.string(),
  expiresAt: z.string(),
  status: z.enum(["active", "revoked", "expired"]),
  createdAt: z.string()
});

export const breakGlassGrantSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string(),
  reason: z.string(),
  approver: z.string().optional(),
  expiresAt: z.string(),
  reviewStatus: z.enum(["pending", "approved", "rejected"]),
  active: z.boolean(),
  createdAt: z.string(),
  reviewedAt: z.string().optional()
});

export const accessDecisionSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  subjectType: z.enum(["user", "service-account"]),
  tenantId: z.string().optional(),
  resource: permissionResourceSchema,
  action: permissionActionSchema,
  resourceId: z.string().optional(),
  allowed: z.boolean(),
  reason: z.string(),
  policyVersion: z.string(),
  createdAt: z.string()
});

export const createServiceAccountSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  owner: z.string().min(1),
  scopes: z.array(z.string().min(1)).min(1),
  expiresAt: z.string().min(1)
});

export const createBreakGlassGrantSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  reason: z.string().min(12),
  expiresAt: z.string().min(1)
});

export const reviewBreakGlassGrantSchema = z.object({
  approver: z.string().min(1),
  approved: z.boolean(),
  notes: z.string().optional()
});

export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type IdentityPrincipal = z.infer<typeof identityPrincipalSchema>;
export type ServiceAccount = z.infer<typeof serviceAccountSchema>;
export type BreakGlassGrant = z.infer<typeof breakGlassGrantSchema>;
export type AccessDecision = z.infer<typeof accessDecisionSchema>;
export type CreateServiceAccountInput = z.infer<typeof createServiceAccountSchema>;
export type CreateBreakGlassGrantInput = z.infer<typeof createBreakGlassGrantSchema>;
export type ReviewBreakGlassGrantInput = z.infer<typeof reviewBreakGlassGrantSchema>;
