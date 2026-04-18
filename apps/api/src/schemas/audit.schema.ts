import { z } from "zod";

export const auditResultSchema = z.enum(["allowed", "denied", "blocked", "failed", "succeeded"]);

export const versionRecordSchema = z.object({
  component: z.string(),
  version: z.string(),
  hash: z.string().optional(),
  effectiveAt: z.string()
});

export const auditEventSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  actor: z.string(),
  action: z.string(),
  resource: z.string(),
  result: auditResultSchema,
  summary: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.unknown()).default({}),
  versions: z.array(versionRecordSchema).default([]),
  sequence: z.number().int().positive(),
  previousHash: z.string(),
  hash: z.string()
});

export const auditIntegrityRecordSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  sequence: z.number().int().positive(),
  previousHash: z.string(),
  currentHash: z.string(),
  verifiedAt: z.string()
});

export const retentionPolicySchema = z.object({
  id: z.string(),
  resourceType: z.string(),
  retentionDays: z.number().int().positive(),
  deletionBehavior: z.enum(["retain_hash", "block_delete", "manual_review"]),
  createdAt: z.string()
});

export const governanceExportFilterSchema = z.object({
  caseId: z.string().optional(),
  action: z.string().optional(),
  result: auditResultSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().positive().max(1000).default(250)
});

export const governanceExportSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  actor: z.string(),
  filters: governanceExportFilterSchema,
  includedEventIds: z.array(z.string()),
  integritySummary: z.object({
    verified: z.boolean(),
    checkedEvents: z.number().int().nonnegative(),
    failures: z.array(z.string())
  }),
  events: z.array(auditEventSchema)
});

export type AuditResult = z.infer<typeof auditResultSchema>;
export type VersionRecord = z.infer<typeof versionRecordSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type AuditIntegrityRecord = z.infer<typeof auditIntegrityRecordSchema>;
export type RetentionPolicy = z.infer<typeof retentionPolicySchema>;
export type GovernanceExportFilter = z.infer<typeof governanceExportFilterSchema>;
export type GovernanceExport = z.infer<typeof governanceExportSchema>;
