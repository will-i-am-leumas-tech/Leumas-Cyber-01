import { z } from "zod";

export const sensitiveFindingTypeSchema = z.enum([
  "api_key",
  "cloud_access_key",
  "email",
  "private_key",
  "secret",
  "token",
  "username"
]);

export const redactionModeSchema = z.enum(["off", "metadata_only", "redact"]);

export const dataClassSchema = z.enum(["public", "internal", "confidential", "restricted"]);

export const sensitiveFindingSchema = z.object({
  id: z.string(),
  type: sensitiveFindingTypeSchema,
  sourceRef: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
  redactionValue: z.string(),
  fingerprintHash: z.string(),
  length: z.number().int().positive(),
  createdAt: z.string()
});

export const redactedArtifactSchema = z.object({
  id: z.string(),
  originalRef: z.string(),
  redactedRef: z.string(),
  redactedText: z.string(),
  findingIds: z.array(z.string()),
  redactionPolicyVersion: z.string(),
  createdAt: z.string()
});

export const promptPackageSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  mode: redactionModeSchema,
  provider: z.string(),
  minimizedFields: z.array(z.string()),
  excludedFindingIds: z.array(z.string()),
  redactionSummary: z.record(z.number().int().nonnegative()),
  promptHash: z.string(),
  rawInputHash: z.string(),
  createdAt: z.string()
});

export const dataClassificationSchema = z.object({
  id: z.string(),
  resourceRef: z.string(),
  dataClass: dataClassSchema,
  reason: z.string(),
  createdAt: z.string()
});

export const encryptionContextSchema = z.object({
  tenantId: z.string(),
  keyRef: z.string(),
  dataClass: dataClassSchema,
  algorithm: z.string().default("managed-by-storage-adapter")
});

export const privacyAuditEventSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  action: z.string(),
  dataClass: dataClassSchema,
  findingCount: z.number().int().nonnegative(),
  summary: z.string(),
  timestamp: z.string()
});

export type SensitiveFindingType = z.infer<typeof sensitiveFindingTypeSchema>;
export type RedactionMode = z.infer<typeof redactionModeSchema>;
export type DataClass = z.infer<typeof dataClassSchema>;
export type SensitiveFinding = z.infer<typeof sensitiveFindingSchema>;
export type RedactedArtifact = z.infer<typeof redactedArtifactSchema>;
export type PromptPackage = z.infer<typeof promptPackageSchema>;
export type DataClassification = z.infer<typeof dataClassificationSchema>;
export type EncryptionContext = z.infer<typeof encryptionContextSchema>;
export type PrivacyAuditEvent = z.infer<typeof privacyAuditEventSchema>;
