import { z } from "zod";
import { severitySchema } from "./result.schema";

export const cloudProviderSchema = z.enum(["aws", "azure", "gcp", "entra", "okta", "generic"]);
export const principalTypeSchema = z.enum(["user", "group", "role", "service_account", "workload_identity"]);
export const postureStatusSchema = z.enum(["pass", "warn", "fail"]);

export const cloudAccountSchema = z.object({
  id: z.string(),
  provider: cloudProviderSchema,
  accountId: z.string(),
  tenantId: z.string().optional(),
  environment: z.string(),
  owner: z.string(),
  createdAt: z.string()
});

export const identityPrincipalSchema = z.object({
  id: z.string(),
  provider: cloudProviderSchema,
  principalId: z.string(),
  displayName: z.string(),
  type: principalTypeSchema,
  mfaEnabled: z.boolean().optional(),
  privilegedRoles: z.array(z.string()).default([]),
  lastSeenAt: z.string().optional()
});

export const cloudEventSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  provider: cloudProviderSchema,
  service: z.string(),
  action: z.string(),
  actor: z.string(),
  resource: z.string(),
  result: z.enum(["success", "failure", "unknown"]),
  sourceIp: z.string().optional(),
  timestamp: z.string(),
  rawRef: z.string(),
  riskSignals: z.array(z.string()).default([])
});

export const postureFindingSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  control: z.string(),
  status: postureStatusSchema,
  severity: severitySchema,
  evidenceRefs: z.array(z.string()),
  remediation: z.string(),
  createdAt: z.string()
});

export const permissionRiskSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  principalId: z.string(),
  resource: z.string(),
  riskyPermission: z.string(),
  exposure: z.string(),
  severity: severitySchema,
  recommendation: z.string(),
  evidenceRefs: z.array(z.string()),
  createdAt: z.string()
});

export const cloudEventImportSchema = z.object({
  caseId: z.string().optional(),
  provider: cloudProviderSchema.optional(),
  account: cloudAccountSchema.omit({ id: true, createdAt: true }).optional(),
  events: z.array(z.unknown()).min(1)
});

export const identityEventImportSchema = z.object({
  caseId: z.string().optional(),
  provider: cloudProviderSchema.optional(),
  events: z.array(z.unknown()).min(1)
});

export type CloudProvider = z.infer<typeof cloudProviderSchema>;
export type PrincipalType = z.infer<typeof principalTypeSchema>;
export type PostureStatus = z.infer<typeof postureStatusSchema>;
export type CloudAccount = z.infer<typeof cloudAccountSchema>;
export type IdentityPrincipal = z.infer<typeof identityPrincipalSchema>;
export type CloudEvent = z.infer<typeof cloudEventSchema>;
export type PostureFinding = z.infer<typeof postureFindingSchema>;
export type PermissionRisk = z.infer<typeof permissionRiskSchema>;
export type CloudEventImportInput = z.infer<typeof cloudEventImportSchema>;
export type IdentityEventImportInput = z.infer<typeof identityEventImportSchema>;
