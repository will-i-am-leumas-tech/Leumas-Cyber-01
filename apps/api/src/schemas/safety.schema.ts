import { z } from "zod";

export const safetyCategorySchema = z.enum(["defensive", "authorized_validation", "lab", "ambiguous", "blocked"]);
export const safetyLayerSchema = z.enum(["input", "retrieval", "output", "tool"]);
export const safetyReasonSchema = z.enum([
  "allowed_defensive",
  "allowed_authorized_validation",
  "allowed_lab",
  "artifact_evidence_allowed",
  "scope_clarification_required",
  "offensive_request_detected",
  "unsafe_output_detected",
  "tool_policy_requires_approval"
]);

export const policyVersionRecordSchema = z.object({
  version: z.string(),
  active: z.boolean(),
  description: z.string(),
  createdAt: z.string()
});

export const safetyDecisionSchema = z.object({
  id: z.string(),
  layer: safetyLayerSchema,
  allowed: z.boolean(),
  category: safetyCategorySchema,
  reason: safetyReasonSchema,
  matchedSignals: z.array(z.string()),
  safeRedirect: z.string().optional(),
  policyVersion: z.string(),
  createdAt: z.string()
});

export const promptInjectionFindingSchema = z.object({
  id: z.string(),
  sourceRef: z.string(),
  pattern: z.string(),
  risk: z.enum(["low", "medium", "high"]),
  mitigation: z.string(),
  createdAt: z.string()
});

export const outputSafetyResultSchema = z.object({
  id: z.string(),
  allowed: z.boolean(),
  blockedSegments: z.array(z.string()),
  repairedOutput: z.string().optional(),
  reason: safetyReasonSchema.optional(),
  policyVersion: z.string(),
  createdAt: z.string()
});

export const toolSafetyResultSchema = z.object({
  id: z.string(),
  connectorId: z.string(),
  operation: z.string(),
  allowed: z.boolean(),
  approvalRequired: z.boolean(),
  reason: safetyReasonSchema.optional(),
  policyVersion: z.string(),
  createdAt: z.string()
});

export type SafetyCategory = z.infer<typeof safetyCategorySchema>;
export type SafetyLayer = z.infer<typeof safetyLayerSchema>;
export type SafetyReason = z.infer<typeof safetyReasonSchema>;
export type PolicyVersionRecord = z.infer<typeof policyVersionRecordSchema>;
export type SafetyDecision = z.infer<typeof safetyDecisionSchema>;
export type PromptInjectionFinding = z.infer<typeof promptInjectionFindingSchema>;
export type OutputSafetyResult = z.infer<typeof outputSafetyResultSchema>;
export type ToolSafetyResult = z.infer<typeof toolSafetyResultSchema>;
