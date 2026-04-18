import { z } from "zod";
import { severitySchema } from "./result.schema";
import { caseStateSchema, workflowPrioritySchema } from "./workflow.schema";

export const analystNoteSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  author: z.string(),
  text: z.string(),
  mentions: z.array(z.string()).default([]),
  visibility: z.enum(["case", "tenant", "private"]).default("case"),
  reviewStatus: z.enum(["open", "acknowledged", "resolved"]).default("open"),
  redacted: z.boolean().default(false),
  auditEntryId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createAnalystNoteSchema = z.object({
  author: z.string().min(1).default("analyst"),
  text: z.string().min(1).max(5000),
  mentions: z.array(z.string()).default([]),
  visibility: z.enum(["case", "tenant", "private"]).default("case"),
  reviewStatus: z.enum(["open", "acknowledged", "resolved"]).default("open")
});

export const caseQueueItemSchema = z.object({
  caseId: z.string(),
  title: z.string(),
  severity: severitySchema,
  priority: workflowPrioritySchema,
  state: caseStateSchema,
  owner: z.string().optional(),
  slaStatus: z.enum(["ok", "watch", "overdue"]),
  flags: z.array(z.string()).default([]),
  updatedAt: z.string(),
  openTaskCount: z.number().int().min(0),
  approvalCount: z.number().int().min(0),
  noteCount: z.number().int().min(0),
  safetyDecisionCount: z.number().int().min(0)
});

export const approvalQueueItemSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  title: z.string(),
  sourceType: z.enum(["action", "sandbox", "validation"]),
  targetId: z.string(),
  risk: workflowPrioritySchema,
  status: z.enum(["pending", "approved", "rejected", "blocked"]),
  approver: z.string().optional(),
  reason: z.string(),
  dueAt: z.string().optional(),
  createdAt: z.string()
});

export const dashboardMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  labels: z.record(z.string()).default({}),
  window: z.string()
});

export type AnalystNote = z.infer<typeof analystNoteSchema>;
export type CreateAnalystNoteInput = z.infer<typeof createAnalystNoteSchema>;
export type CaseQueueItem = z.infer<typeof caseQueueItemSchema>;
export type ApprovalQueueItem = z.infer<typeof approvalQueueItemSchema>;
export type DashboardMetric = z.infer<typeof dashboardMetricSchema>;
