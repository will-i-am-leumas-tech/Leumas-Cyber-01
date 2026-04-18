import { z } from "zod";

export const validationStatusSchema = z.enum(["planned", "in_progress", "completed", "blocked"]);
export const validationResultStatusSchema = z.enum(["passed", "partial", "failed"]);

export const authorizationScopeSchema = z.object({
  id: z.string(),
  name: z.string(),
  assets: z.array(z.string()),
  owners: z.array(z.string()),
  startsAt: z.string(),
  expiresAt: z.string(),
  approvers: z.array(z.string()),
  allowedTestTypes: z.array(z.string()),
  exclusions: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const telemetryExpectationSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  objectiveId: z.string(),
  dataSource: z.string(),
  expectedEventType: z.string(),
  detectionRuleRef: z.string().optional(),
  required: z.boolean().default(true)
});

export const validationObjectiveSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  templateId: z.string(),
  title: z.string(),
  category: z.string(),
  expectedTelemetry: z.array(telemetryExpectationSchema),
  successCriteria: z.array(z.string()),
  safetyNotes: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const validationCampaignSchema = z.object({
  id: z.string(),
  scopeId: z.string(),
  objective: z.string(),
  controlsUnderTest: z.array(z.string()),
  status: validationStatusSchema,
  owner: z.string(),
  safetyWarnings: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const validationResultSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  observedTelemetry: z.array(z.string()),
  gaps: z.array(z.string()),
  remediationTasks: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  status: validationResultStatusSchema,
  createdAt: z.string()
});

export const createAuthorizationScopeSchema = z.object({
  name: z.string().min(1),
  assets: z.array(z.string().min(1)).min(1),
  owners: z.array(z.string().min(1)).min(1),
  startsAt: z.string().min(1),
  expiresAt: z.string().min(1),
  approvers: z.array(z.string().min(1)).min(1),
  allowedTestTypes: z.array(z.string().min(1)).min(1),
  exclusions: z.array(z.string()).default([])
});

export const createValidationCampaignSchema = z.object({
  scopeId: z.string().min(1),
  objective: z.string().min(1),
  objectiveTemplateIds: z.array(z.string().min(1)).min(1).default(["detect-encoded-powershell"]),
  controlsUnderTest: z.array(z.string().min(1)).min(1),
  owner: z.string().min(1).default("analyst"),
  requestedSteps: z.string().optional()
});

export const createValidationResultSchema = z.object({
  observedTelemetry: z.array(z.string().min(1)).default([]),
  evidenceRefs: z.array(z.string().min(1)).default([])
});

export type AuthorizationScope = z.infer<typeof authorizationScopeSchema>;
export type ValidationResultStatus = z.infer<typeof validationResultStatusSchema>;
export type TelemetryExpectation = z.infer<typeof telemetryExpectationSchema>;
export type ValidationObjective = z.infer<typeof validationObjectiveSchema>;
export type ValidationCampaign = z.infer<typeof validationCampaignSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type CreateAuthorizationScopeInput = z.infer<typeof createAuthorizationScopeSchema>;
export type CreateValidationCampaignInput = z.infer<typeof createValidationCampaignSchema>;
export type CreateValidationResultInput = z.infer<typeof createValidationResultSchema>;
