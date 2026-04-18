import { z } from "zod";

export const hypothesisNodeStatusSchema = z.enum(["supported", "needs_review", "rejected"]);
export const reasoningReviewStatusSchema = z.enum(["unreviewed", "approved", "needs_more_evidence", "rejected"]);

export const hypothesisNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: hypothesisNodeStatusSchema,
  confidence: z.number().min(0).max(1),
  evidenceObservationIds: z.array(z.string()),
  counterEvidenceObservationIds: z.array(z.string()).default([]),
  parentId: z.string().optional(),
  childIds: z.array(z.string()).default([]),
  reviewStatus: reasoningReviewStatusSchema.default("unreviewed")
});

export const contradictionRecordSchema = z.object({
  id: z.string(),
  sourceObservationIds: z.array(z.string()),
  conflictType: z.enum(["source_conflict", "timeline_conflict", "confidence_conflict", "unsupported_claim"]),
  explanation: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  resolutionStatus: z.enum(["open", "resolved", "accepted_risk"]).default("open")
});

export const unknownRecordSchema = z.object({
  id: z.string(),
  question: z.string(),
  reason: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  suggestedSource: z.string(),
  status: z.enum(["open", "answered", "not_applicable"]).default("open")
});

export const techniqueMappingSchema = z.object({
  id: z.string(),
  framework: z.literal("MITRE ATT&CK"),
  tactic: z.string(),
  techniqueId: z.string(),
  techniqueName: z.string(),
  evidenceObservationIds: z.array(z.string()),
  confidence: z.number().min(0).max(1)
});

export const reasoningReviewSchema = z.object({
  id: z.string(),
  targetType: z.enum(["hypothesis", "finding", "contradiction", "unknown", "technique"]),
  targetId: z.string(),
  status: reasoningReviewStatusSchema,
  reviewer: z.string(),
  notes: z.string().optional(),
  timestamp: z.string()
});

export const cyberReasoningV2Schema = z.object({
  hypothesisNodes: z.array(hypothesisNodeSchema),
  contradictions: z.array(contradictionRecordSchema),
  unknownRecords: z.array(unknownRecordSchema),
  techniqueMappings: z.array(techniqueMappingSchema),
  reviews: z.array(reasoningReviewSchema).default([])
});

export type HypothesisNode = z.infer<typeof hypothesisNodeSchema>;
export type ContradictionRecord = z.infer<typeof contradictionRecordSchema>;
export type UnknownRecord = z.infer<typeof unknownRecordSchema>;
export type TechniqueMapping = z.infer<typeof techniqueMappingSchema>;
export type ReasoningReview = z.infer<typeof reasoningReviewSchema>;
export type CyberReasoningV2 = z.infer<typeof cyberReasoningV2Schema>;
