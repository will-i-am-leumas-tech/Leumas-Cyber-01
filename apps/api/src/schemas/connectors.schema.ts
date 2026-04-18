import { z } from "zod";
import { connectorTypeSchema, credentialRefSchema } from "./tools.schema";

export const connectorOperationSchema = z.object({
  id: z.string(),
  description: z.string(),
  readOnly: z.boolean()
});

export const connectorDefinitionSchema = z.object({
  id: z.string(),
  type: connectorTypeSchema,
  vendor: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  operations: z.array(connectorOperationSchema),
  credentialRef: credentialRefSchema,
  dataClasses: z.array(z.enum(["public", "internal", "confidential", "restricted"])).default(["internal"])
});

export const connectorQueryRequestSchema = z.object({
  operation: z.string().min(1),
  actor: z.string().min(1).default("analyst"),
  query: z.string().optional(),
  filters: z.record(z.unknown()).default({}),
  limit: z.number().int().positive().max(100).default(10)
});

export const connectorQueryResultSchema = z.object({
  connectorId: z.string(),
  operation: z.string(),
  summary: z.string(),
  recordRefs: z.array(z.string()),
  records: z.array(z.record(z.unknown())),
  sensitiveFields: z.array(z.string()).default([]),
  retrievedAt: z.string()
});

export const connectorHealthSchema = z.object({
  connectorId: z.string(),
  ok: z.boolean(),
  status: z.enum(["healthy", "degraded", "disabled"]),
  message: z.string(),
  checkedAt: z.string()
});

export const connectorEvidenceRefSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  connectorId: z.string(),
  source: z.string(),
  externalId: z.string(),
  retrievedAt: z.string(),
  recordHash: z.string(),
  dataClass: z.enum(["public", "internal", "confidential", "restricted"]),
  summary: z.string()
});

export type ConnectorOperation = z.infer<typeof connectorOperationSchema>;
export type ConnectorDefinition = z.infer<typeof connectorDefinitionSchema>;
export type ConnectorQueryRequest = z.infer<typeof connectorQueryRequestSchema>;
export type ConnectorQueryResult = z.infer<typeof connectorQueryResultSchema>;
export type ConnectorHealth = z.infer<typeof connectorHealthSchema>;
export type ConnectorEvidenceRef = z.infer<typeof connectorEvidenceRefSchema>;
