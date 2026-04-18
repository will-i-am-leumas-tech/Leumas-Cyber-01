import { z } from "zod";

export const caseStateSchema = z.enum(["new", "triaging", "investigating", "contained", "remediating", "monitoring", "closed"]);
export const workflowPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export const taskStatusSchema = z.enum(["open", "in_progress", "blocked", "done", "cancelled"]);
export const decisionTypeSchema = z.enum(["note", "closure_override", "risk_acceptance", "escalation"]);

export const investigationTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  owner: z.string().optional(),
  priority: workflowPrioritySchema,
  status: taskStatusSchema,
  dueAt: z.string().optional(),
  linkedFindingIds: z.array(z.string()).default([]),
  required: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const decisionRecordSchema = z.object({
  id: z.string(),
  decisionType: decisionTypeSchema,
  decision: z.string(),
  rationale: z.string(),
  approver: z.string(),
  evidenceRefs: z.array(z.string()).default([]),
  timestamp: z.string()
});

export const workflowTransitionSchema = z.object({
  id: z.string(),
  from: caseStateSchema,
  to: caseStateSchema,
  actor: z.string(),
  reason: z.string(),
  timestamp: z.string()
});

export const workflowSummarySchema = z.object({
  state: caseStateSchema,
  priority: workflowPrioritySchema,
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).default([]),
  tasks: z.array(investigationTaskSchema).default([]),
  decisions: z.array(decisionRecordSchema).default([]),
  workflowTransitions: z.array(workflowTransitionSchema).default([])
});

export type CaseState = z.infer<typeof caseStateSchema>;
export type WorkflowPriority = z.infer<typeof workflowPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type DecisionType = z.infer<typeof decisionTypeSchema>;
export type InvestigationTask = z.infer<typeof investigationTaskSchema>;
export type DecisionRecord = z.infer<typeof decisionRecordSchema>;
export type WorkflowTransition = z.infer<typeof workflowTransitionSchema>;
export type WorkflowSummary = z.infer<typeof workflowSummarySchema>;
