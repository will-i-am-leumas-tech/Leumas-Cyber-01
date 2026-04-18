import { z } from "zod";
import { normalizedEventSchema } from "./ingest.schema";
import { dataClassSchema } from "./privacy.schema";

export const evidenceSourceTypeSchema = z.enum([
  "dns",
  "proxy",
  "email_security",
  "siem",
  "edr",
  "identity",
  "cloud",
  "artifact"
]);

export const retentionClassSchema = z.enum(["ephemeral", "standard", "legal_hold"]);

export const evidenceSourceRegistrationSchema = z.object({
  name: z.string().min(1),
  type: evidenceSourceTypeSchema,
  owner: z.string().min(1),
  parserId: z.string().min(1).optional(),
  connectorId: z.string().min(1).optional(),
  reliabilityScore: z.number().min(0).max(1).optional(),
  retentionClass: retentionClassSchema.default("standard"),
  dataClass: dataClassSchema.default("internal"),
  enabled: z.boolean().default(true)
});

export const evidenceSourceSchema = evidenceSourceRegistrationSchema.extend({
  id: z.string(),
  parserId: z.string().min(1),
  reliabilityScore: z.number().min(0).max(1),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ingestionJobStatusSchema = z.enum(["queued", "running", "completed", "failed"]);

export const ingestionCountersSchema = z.object({
  recordsSeen: z.number().int().nonnegative().default(0),
  recordsParsed: z.number().int().nonnegative().default(0),
  recordsDeduplicated: z.number().int().nonnegative().default(0),
  parserWarnings: z.number().int().nonnegative().default(0)
});

export const ingestionJobSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  status: ingestionJobStatusSchema,
  actor: z.string(),
  requestedAt: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  counters: ingestionCountersSchema,
  errors: z.array(z.string()).default([])
});

export const ingestionJobRequestSchema = z.object({
  sourceId: z.string().min(1),
  actor: z.string().min(1).default("analyst"),
  text: z.string().optional(),
  json: z.unknown().optional()
});

export const evidenceRecordSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceType: evidenceSourceTypeSchema,
  sourceName: z.string(),
  jobId: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  timestamp: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  normalizedEvent: normalizedEventSchema,
  hash: z.string(),
  fingerprint: z.string(),
  duplicate: z.boolean().default(false),
  duplicateOf: z.string().optional(),
  dataClass: dataClassSchema,
  reliabilityScore: z.number().min(0).max(1),
  sensitiveFindingIds: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const chainOfCustodyOperationSchema = z.enum([
  "source_registered",
  "retrieved",
  "parsed",
  "deduplicated",
  "classified",
  "case_linked"
]);

export const chainOfCustodyEntrySchema = z.object({
  id: z.string(),
  evidenceId: z.string(),
  sourceId: z.string(),
  actor: z.string(),
  operation: chainOfCustodyOperationSchema,
  timestamp: z.string(),
  inputHash: z.string().optional(),
  outputHash: z.string().optional(),
  details: z.record(z.unknown()).default({})
});

export const deduplicationRecordSchema = z.object({
  fingerprint: z.string(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  sourceIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  duplicateCount: z.number().int().nonnegative()
});

export const caseEvidenceImportRequestSchema = z.object({
  evidenceIds: z.array(z.string().min(1)).min(1),
  actor: z.string().min(1).default("analyst"),
  note: z.string().optional()
});

export type EvidenceSourceType = z.infer<typeof evidenceSourceTypeSchema>;
export type RetentionClass = z.infer<typeof retentionClassSchema>;
export type EvidenceSourceRegistration = z.infer<typeof evidenceSourceRegistrationSchema>;
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type IngestionJobStatus = z.infer<typeof ingestionJobStatusSchema>;
export type IngestionCounters = z.infer<typeof ingestionCountersSchema>;
export type IngestionJob = z.infer<typeof ingestionJobSchema>;
export type IngestionJobRequest = z.infer<typeof ingestionJobRequestSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type ChainOfCustodyOperation = z.infer<typeof chainOfCustodyOperationSchema>;
export type ChainOfCustodyEntry = z.infer<typeof chainOfCustodyEntrySchema>;
export type DeduplicationRecord = z.infer<typeof deduplicationRecordSchema>;
export type CaseEvidenceImportRequest = z.infer<typeof caseEvidenceImportRequestSchema>;
