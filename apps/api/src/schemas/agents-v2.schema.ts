import { z } from "zod";
import { agentRoleIdSchema, agentTaskStatusSchema, agentValidationStatusSchema } from "./agents.schema";

export const agentBudgetSchema = z.object({
  maxTaskMs: z.number().int().positive(),
  maxToolCalls: z.number().int().nonnegative(),
  maxMemoryItems: z.number().int().positive()
});

export const agentRoleContractSchema = z.object({
  id: agentRoleIdSchema,
  domain: z.string(),
  allowedTasks: z.array(z.string()),
  requiredEvidence: z.array(z.string()).default([]),
  outputSchema: z.string(),
  budget: agentBudgetSchema,
  safetyRequirements: z.array(z.string()).default([])
});

export const agentTraceSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  runId: z.string(),
  taskId: z.string(),
  role: agentRoleIdSchema,
  inputRefs: z.array(z.string()),
  outputRefs: z.array(z.string()),
  toolRefs: z.array(z.string()).default([]),
  policyDecisions: z.array(z.string()).default([]),
  startedAt: z.string(),
  completedAt: z.string(),
  durationMs: z.number().int().nonnegative(),
  status: agentTaskStatusSchema
});

export const agentMemoryItemSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  evidenceIds: z.array(z.string()),
  summary: z.string(),
  source: z.string(),
  expiresAt: z.string(),
  reviewState: z.enum(["pending", "reviewed", "rejected"])
});

export const reviewerFindingSchema = z.object({
  id: z.string(),
  runId: z.string(),
  status: z.enum(["passed", "needs_review", "blocked"]),
  groundingFailures: z.array(z.string()).default([]),
  safetyFailures: z.array(z.string()).default([]),
  completenessWarnings: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const arbitrationV2ResultSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  runId: z.string().optional(),
  conflictRefs: z.array(z.string()).default([]),
  selectedResultRef: z.string().optional(),
  rationale: z.string(),
  evidenceIds: z.array(z.string()).default([]),
  reviewerStatus: agentValidationStatusSchema,
  createdAt: z.string()
});

export const operatorOverrideSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  actor: z.string(),
  decision: z.enum(["approve", "reject", "request_changes"]),
  reason: z.string(),
  affectedFindingIds: z.array(z.string()).default([]),
  timestamp: z.string()
});

export const createOperatorOverrideSchema = z.object({
  actor: z.string().min(1),
  decision: z.enum(["approve", "reject", "request_changes"]),
  reason: z.string().min(1),
  affectedFindingIds: z.array(z.string()).default([])
});

export type AgentBudget = z.infer<typeof agentBudgetSchema>;
export type AgentRoleContract = z.infer<typeof agentRoleContractSchema>;
export type AgentTrace = z.infer<typeof agentTraceSchema>;
export type AgentMemoryItem = z.infer<typeof agentMemoryItemSchema>;
export type ReviewerFinding = z.infer<typeof reviewerFindingSchema>;
export type ArbitrationV2Result = z.infer<typeof arbitrationV2ResultSchema>;
export type OperatorOverride = z.infer<typeof operatorOverrideSchema>;
export type CreateOperatorOverrideInput = z.infer<typeof createOperatorOverrideSchema>;
