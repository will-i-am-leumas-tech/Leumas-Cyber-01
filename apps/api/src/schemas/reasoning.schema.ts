import { z } from "zod";

const reasoningSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const sourceRefSchema = z.object({
  id: z.string(),
  type: z.enum(["input", "adapter", "indicator", "timeline", "provider"]),
  locator: z.string(),
  excerpt: z.string().optional()
});

export const observationTypeSchema = z.enum(["fact", "indicator", "timeline_event", "analyst_note", "unknown"]);

export const observationSchema = z.object({
  id: z.string(),
  type: observationTypeSchema,
  value: z.string(),
  confidence: z.number().min(0).max(1),
  sourceRef: sourceRefSchema,
  timestamp: z.string().optional(),
  entityRefs: z.array(z.string()).default([])
});

export const hypothesisSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["supported", "needs_review", "rejected"]),
  confidence: z.number().min(0).max(1),
  reasoningSummary: z.string(),
  supportingObservationIds: z.array(z.string()),
  contradictingObservationIds: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  unknowns: z.array(z.string()).default([])
});

export const findingSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: reasoningSeveritySchema,
  category: z.string(),
  confidence: z.number().min(0).max(1),
  reasoningSummary: z.string(),
  evidenceObservationIds: z.array(z.string()),
  recommendations: z.array(z.string()),
  needsAnalystReview: z.boolean()
});

export const reasoningRunSchema = z.object({
  id: z.string(),
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  inputHash: z.string(),
  outputHash: z.string().optional(),
  validationStatus: z.enum(["passed", "failed", "blocked"]),
  validationSummary: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional()
});

export const reasoningBundleSchema = z.object({
  observations: z.array(observationSchema),
  hypotheses: z.array(hypothesisSchema),
  findings: z.array(findingSchema),
  reasoningRuns: z.array(reasoningRunSchema),
  assumptions: z.array(z.string()).default([]),
  unknowns: z.array(z.string()).default([])
});

export type SourceRef = z.infer<typeof sourceRefSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type Hypothesis = z.infer<typeof hypothesisSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type ReasoningRun = z.infer<typeof reasoningRunSchema>;
export type ReasoningBundle = z.infer<typeof reasoningBundleSchema>;
