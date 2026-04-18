import { z } from "zod";

export const actionRiskSchema = z.enum(["low", "medium", "high", "critical"]);
export const actionStepStatusSchema = z.enum(["planned", "dry_run_ready", "approved", "executed", "blocked", "failed"]);
export const approvalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const actionExecutionStatusSchema = z.enum(["success", "blocked", "failed"]);

export const actionStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  connectorId: z.string(),
  operation: z.string(),
  parametersHash: z.string(),
  parameterSummary: z.string(),
  risk: actionRiskSchema,
  approvalRequired: z.boolean(),
  status: actionStepStatusSchema,
  dryRunResult: z.string().optional(),
  rollbackHint: z.string().optional()
});

export const actionPlanSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  objective: z.string(),
  risk: actionRiskSchema,
  targetEntityIds: z.array(z.string()).default([]),
  expectedOutcome: z.string(),
  steps: z.array(actionStepSchema),
  status: z.enum(["planned", "dry_run_ready", "approved", "executed", "blocked"]).default("planned"),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const approvalRequestSchema = z.object({
  id: z.string(),
  actionPlanId: z.string(),
  approverRole: z.string(),
  requestedBy: z.string(),
  status: approvalStatusSchema,
  reason: z.string(),
  decidedBy: z.string().optional(),
  decidedAt: z.string().optional(),
  createdAt: z.string()
});

export const actionExecutionSchema = z.object({
  id: z.string(),
  actionPlanId: z.string(),
  actionStepId: z.string(),
  status: actionExecutionStatusSchema,
  result: z.string(),
  rollbackHint: z.string().optional(),
  timestamp: z.string()
});

export const createActionPlanSchema = z.object({
  objective: z.string().min(1),
  risk: actionRiskSchema.default("low"),
  targetEntityIds: z.array(z.string()).optional(),
  expectedOutcome: z.string().min(1).default("Defensive action is prepared for analyst review."),
  createdBy: z.string().min(1).default("analyst"),
  steps: z
    .array(
      z.object({
        title: z.string().min(1),
        connectorId: z.string().min(1).default("manual"),
        operation: z.string().min(1),
        parameters: z.record(z.unknown()).default({}),
        risk: actionRiskSchema.default("low"),
        rollbackHint: z.string().optional()
      })
    )
    .default([])
});

export const approvalDecisionSchema = z.object({
  approverRole: z.string().min(1).default("lead"),
  requestedBy: z.string().min(1).default("analyst"),
  reason: z.string().min(1),
  status: approvalStatusSchema.default("pending"),
  decidedBy: z.string().optional()
});

export type ActionRisk = z.infer<typeof actionRiskSchema>;
export type ActionStep = z.infer<typeof actionStepSchema>;
export type ActionPlan = z.infer<typeof actionPlanSchema>;
export type ApprovalRequest = z.infer<typeof approvalRequestSchema>;
export type ActionExecution = z.infer<typeof actionExecutionSchema>;
export type CreateActionPlanInput = z.infer<typeof createActionPlanSchema>;
