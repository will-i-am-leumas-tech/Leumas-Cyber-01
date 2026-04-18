import { z } from "zod";

export const agentRoleIdSchema = z.enum(["parser", "investigator", "retriever", "reporter", "safetyReviewer", "toolExecutor"]);
export const agentTaskStatusSchema = z.enum(["queued", "running", "completed", "failed", "blocked"]);
export const agentValidationStatusSchema = z.enum(["passed", "failed"]);
export const orchestrationStatusSchema = z.enum(["planned", "running", "completed", "failed", "blocked"]);

export const agentRoleSchema = z.object({
  id: agentRoleIdSchema,
  displayName: z.string(),
  description: z.string(),
  allowedTools: z.array(z.string()).default([]),
  maxTimeoutMs: z.number().int().positive()
});

export const agentTaskSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  runId: z.string(),
  role: agentRoleIdSchema,
  inputArtifactRefs: z.array(z.string()),
  expectedSchema: z.string(),
  status: agentTaskStatusSchema,
  timeoutMs: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const agentResultSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  role: agentRoleIdSchema,
  output: z.record(z.unknown()),
  validationStatus: agentValidationStatusSchema,
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const orchestrationRunSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  plan: z.string(),
  taskIds: z.array(z.string()),
  finalStatus: orchestrationStatusSchema,
  createdAt: z.string(),
  completedAt: z.string().optional()
});

export const arbitrationResultSchema = z.object({
  id: z.string(),
  runId: z.string(),
  selectedFindingIds: z.array(z.string()),
  conflicts: z.array(z.string()).default([]),
  reviewerNotes: z.string(),
  validationStatus: agentValidationStatusSchema,
  createdAt: z.string()
});

export type AgentRoleId = z.infer<typeof agentRoleIdSchema>;
export type AgentTaskStatus = z.infer<typeof agentTaskStatusSchema>;
export type AgentValidationStatus = z.infer<typeof agentValidationStatusSchema>;
export type OrchestrationStatus = z.infer<typeof orchestrationStatusSchema>;
export type AgentRole = z.infer<typeof agentRoleSchema>;
export type AgentTask = z.infer<typeof agentTaskSchema>;
export type AgentResult = z.infer<typeof agentResultSchema>;
export type OrchestrationRun = z.infer<typeof orchestrationRunSchema>;
export type ArbitrationResult = z.infer<typeof arbitrationResultSchema>;
