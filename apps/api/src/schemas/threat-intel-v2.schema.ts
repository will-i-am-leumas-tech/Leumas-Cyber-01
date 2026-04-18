import { z } from "zod";
import { severitySchema } from "./result.schema";

export const intelSourceTypeSchema = z.enum(["stix-file", "taxii", "misp", "internal", "manual"]);

export const intelSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: intelSourceTypeSchema,
  trustScore: z.number().min(0).max(1),
  owner: z.string(),
  updateCadence: z.string(),
  retentionDays: z.number().int().positive(),
  enabled: z.boolean(),
  lastImportedAt: z.string().optional(),
  createdAt: z.string()
});

export const stixObjectTypeSchema = z.enum([
  "indicator",
  "malware",
  "tool",
  "campaign",
  "intrusion-set",
  "threat-actor",
  "report",
  "relationship",
  "attack-pattern",
  "identity",
  "observed-data",
  "sighting",
  "other"
]);

export const stixObjectRecordSchema = z.object({
  id: z.string(),
  stixId: z.string(),
  type: stixObjectTypeSchema,
  name: z.string().optional(),
  indicatorType: z.string().optional(),
  indicatorValue: z.string().optional(),
  pattern: z.string().optional(),
  sourceId: z.string(),
  confidence: z.number().min(0).max(1),
  decayedConfidence: z.number().min(0).max(1),
  labels: z.array(z.string()).default([]),
  firstSeen: z.string().optional(),
  lastSeen: z.string().optional(),
  expiresAt: z.string().optional(),
  content: z.record(z.unknown()),
  createdAt: z.string()
});

export const intelRelationshipSchema = z.object({
  id: z.string(),
  sourceObjectId: z.string(),
  targetObjectId: z.string(),
  relationshipType: z.string(),
  evidence: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  sourceId: z.string(),
  createdAt: z.string()
});

export const internalPrevalenceRecordSchema = z.object({
  id: z.string(),
  indicatorId: z.string(),
  indicatorValue: z.string().optional(),
  telemetrySource: z.string(),
  count: z.number().int().nonnegative(),
  lastSeen: z.string(),
  caseRefs: z.array(z.string()).default([]),
  prevalenceScore: z.number().min(0).max(1),
  createdAt: z.string()
});

export const retroHuntQuerySchema = z.object({
  id: z.string(),
  indicatorId: z.string(),
  dataSource: z.string(),
  query: z.string(),
  expectedEvidence: z.array(z.string()),
  readOnly: z.literal(true)
});

export const retroHuntRequestSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  indicatorIds: z.array(z.string()),
  dataSources: z.array(z.string()),
  timeRange: z.object({
    start: z.string(),
    end: z.string()
  }),
  status: z.enum(["planned", "queued", "complete"]),
  results: z.array(retroHuntQuerySchema),
  createdAt: z.string()
});

export const intelGraphNodeSchema = z.object({
  id: z.string(),
  type: stixObjectTypeSchema,
  label: z.string(),
  confidence: z.number().min(0).max(1),
  sourceId: z.string()
});

export const intelGraphEdgeSchema = z.object({
  id: z.string(),
  sourceObjectId: z.string(),
  targetObjectId: z.string(),
  relationshipType: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string())
});

export const intelGraphSchema = z.object({
  objectId: z.string(),
  nodes: z.array(intelGraphNodeSchema),
  edges: z.array(intelGraphEdgeSchema),
  citations: z.array(z.string())
});

export const createIntelSourceSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  type: intelSourceTypeSchema,
  trustScore: z.number().min(0).max(1),
  owner: z.string().min(1),
  updateCadence: z.string().min(1),
  retentionDays: z.number().int().positive().default(90),
  enabled: z.boolean().default(true)
});

export const importIntelFeedSchema = z.object({
  caseId: z.string().optional(),
  sourceId: z.string().min(1),
  format: z.enum(["stix", "misp"]),
  bundle: z.record(z.unknown()).optional(),
  event: z.record(z.unknown()).optional()
});

export const retroHuntRequestInputSchema = z.object({
  caseId: z.string().optional(),
  indicatorIds: z.array(z.string().min(1)).min(1),
  dataSources: z.array(z.string().min(1)).min(1),
  timeRange: z.object({
    start: z.string().min(1),
    end: z.string().min(1)
  })
});

export const intelDetectionInputSchema = z.object({
  caseId: z.string().optional(),
  indicatorIds: z.array(z.string().min(1)).min(1),
  severity: severitySchema.default("medium"),
  dataSources: z.array(z.string().min(1)).default(["dns.logs", "proxy.logs", "endpoint.events"])
});

export type IntelSource = z.infer<typeof intelSourceSchema>;
export type IntelSourceType = z.infer<typeof intelSourceTypeSchema>;
export type StixObjectType = z.infer<typeof stixObjectTypeSchema>;
export type StixObjectRecord = z.infer<typeof stixObjectRecordSchema>;
export type IntelRelationship = z.infer<typeof intelRelationshipSchema>;
export type InternalPrevalenceRecord = z.infer<typeof internalPrevalenceRecordSchema>;
export type RetroHuntQuery = z.infer<typeof retroHuntQuerySchema>;
export type RetroHuntRequest = z.infer<typeof retroHuntRequestSchema>;
export type IntelGraph = z.infer<typeof intelGraphSchema>;
export type CreateIntelSourceInput = z.infer<typeof createIntelSourceSchema>;
export type ImportIntelFeedInput = z.infer<typeof importIntelFeedSchema>;
export type RetroHuntRequestInput = z.infer<typeof retroHuntRequestInputSchema>;
export type IntelDetectionInput = z.infer<typeof intelDetectionInputSchema>;
