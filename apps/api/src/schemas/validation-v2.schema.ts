import { z } from "zod";

export const authorizedScopeV2Schema = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  approver: z.string(),
  targetAllowlist: z.array(z.string()).min(1),
  targetDenylist: z.array(z.string()).default([]),
  startsAt: z.string(),
  expiresAt: z.string(),
  labMode: z.boolean(),
  approvedTemplateIds: z.array(z.string()).default([]),
  signature: z.string(),
  createdAt: z.string()
});

export const createAuthorizedScopeV2Schema = z.object({
  name: z.string().min(1),
  owner: z.string().min(1),
  approver: z.string().min(1),
  targetAllowlist: z.array(z.string().min(1)).min(1),
  targetDenylist: z.array(z.string().min(1)).default([]),
  startsAt: z.string().min(1),
  expiresAt: z.string().min(1),
  labMode: z.boolean().default(true),
  approvedTemplateIds: z.array(z.string().min(1)).default(["safe-control-validation"])
});

export const validationTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  category: z.string(),
  allowedTelemetry: z.array(z.string()),
  blockedContent: z.array(z.string()),
  requiredControls: z.array(z.string()),
  attackMapping: z.array(z.string()).default([]),
  requiresLabMode: z.boolean().default(true),
  safetyNotes: z.array(z.string()).default([])
});

export const validationCampaignV2StatusSchema = z.enum(["planned", "blocked", "replayed", "reported"]);

export const validationCampaignV2Schema = z.object({
  id: z.string(),
  scopeId: z.string(),
  templateIds: z.array(z.string()).min(1),
  actor: z.string(),
  target: z.string(),
  status: validationCampaignV2StatusSchema,
  evidenceIds: z.array(z.string()).default([]),
  safetyDecisions: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createValidationCampaignV2Schema = z.object({
  scopeId: z.string().min(1),
  templateIds: z.array(z.string().min(1)).min(1),
  actor: z.string().min(1),
  target: z.string().min(1),
  requestedObjective: z.string().optional()
});

export const replayedTelemetryEventSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  templateId: z.string(),
  target: z.string(),
  telemetryType: z.string(),
  summary: z.string(),
  evidenceId: z.string(),
  generatedAt: z.string()
});

export const controlEvidenceReportSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  detectionsObserved: z.array(z.string()),
  missingTelemetry: z.array(z.string()),
  gaps: z.array(z.string()),
  remediation: z.array(z.string()),
  citations: z.array(z.string()),
  createdAt: z.string()
});

export type AuthorizedScopeV2 = z.infer<typeof authorizedScopeV2Schema>;
export type CreateAuthorizedScopeV2Input = z.infer<typeof createAuthorizedScopeV2Schema>;
export type ValidationTemplate = z.infer<typeof validationTemplateSchema>;
export type ValidationCampaignV2Status = z.infer<typeof validationCampaignV2StatusSchema>;
export type ValidationCampaignV2 = z.infer<typeof validationCampaignV2Schema>;
export type CreateValidationCampaignV2Input = z.infer<typeof createValidationCampaignV2Schema>;
export type ReplayedTelemetryEvent = z.infer<typeof replayedTelemetryEventSchema>;
export type ControlEvidenceReport = z.infer<typeof controlEvidenceReportSchema>;
