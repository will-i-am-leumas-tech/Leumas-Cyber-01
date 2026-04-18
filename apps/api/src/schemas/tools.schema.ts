import { z } from "zod";

export const connectorTypeSchema = z.enum(["siem", "edr", "identity", "cloud", "threat_intel", "ticketing"]);
export const toolCallStatusSchema = z.enum(["allowed", "denied", "completed", "failed"]);
export const toolResultStatusSchema = z.enum(["success", "error"]);

export const credentialRefSchema = z.object({
  type: z.enum(["none", "env", "vault"]),
  ref: z.string()
});

export const connectorSchema = z.object({
  id: z.string(),
  type: connectorTypeSchema,
  name: z.string(),
  enabled: z.boolean(),
  capabilities: z.array(z.string()),
  credentialRef: credentialRefSchema
});

export const toolCallSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  connectorId: z.string(),
  operation: z.string(),
  actor: z.string(),
  parametersHash: z.string(),
  status: toolCallStatusSchema,
  sandboxRunId: z.string().optional(),
  timestamp: z.string(),
  summary: z.string()
});

export const toolResultSchema = z.object({
  id: z.string(),
  toolCallId: z.string(),
  status: toolResultStatusSchema,
  summary: z.string(),
  recordRefs: z.array(z.string()).default([]),
  records: z.array(z.record(z.unknown())).default([]),
  sensitiveFields: z.array(z.string()).default([]),
  sandboxArtifactIds: z.array(z.string()).default([]),
  redactionStatus: z.enum(["not_required", "redacted"]).default("not_required")
});

export const toolCallRequestSchema = z.object({
  connectorId: z.string().min(1),
  operation: z.string().min(1),
  actor: z.string().min(1).default("analyst"),
  parameters: z.record(z.unknown()).default({})
});

export type ConnectorType = z.infer<typeof connectorTypeSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type CredentialRef = z.infer<typeof credentialRefSchema>;
export type ToolCall = z.infer<typeof toolCallSchema>;
export type ToolResult = z.infer<typeof toolResultSchema>;
export type ToolCallRequest = z.infer<typeof toolCallRequestSchema>;
