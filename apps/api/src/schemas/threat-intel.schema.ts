import { z } from "zod";
import { indicatorSchema } from "./result.schema";

export const threatIntelSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["local", "external", "internal"]),
  trustTier: z.enum(["internal", "standard", "vendor", "community"]),
  reliability: z.number().min(0).max(1),
  terms: z.string(),
  enabled: z.boolean()
});

export const indicatorVerdictSchema = z.enum(["benign", "suspicious", "malicious", "unknown"]);

export const indicatorEnrichmentSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  indicatorId: z.string(),
  indicatorType: z.string(),
  indicatorValue: z.string(),
  sourceId: z.string(),
  verdict: indicatorVerdictSchema,
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()).default([]),
  firstSeen: z.string().optional(),
  lastSeen: z.string().optional(),
  createdAt: z.string()
});

export const internalSightingSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  indicatorId: z.string(),
  source: z.string(),
  asset: z.string(),
  timestamp: z.string(),
  eventRef: z.string()
});

export const indicatorLifecycleSchema = z.object({
  id: z.string(),
  indicatorId: z.string(),
  status: z.enum(["active", "expired", "revoked", "false_positive"]),
  expiresAt: z.string().optional(),
  falsePositiveReason: z.string().optional(),
  owner: z.string(),
  updatedAt: z.string()
});

export const threatContextSummarySchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  indicatorId: z.string(),
  defensiveSummary: z.string(),
  relatedBehaviors: z.array(z.string()).default([]),
  recommendedHandling: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  createdAt: z.string()
});

export const threatIntelEnrichSchema = z.object({
  caseId: z.string().optional(),
  indicators: z.array(indicatorSchema).min(1)
});

export const createInternalSightingSchema = z.object({
  caseId: z.string().optional(),
  indicatorId: z.string().min(1),
  source: z.string().min(1),
  asset: z.string().min(1),
  timestamp: z.string().min(1),
  eventRef: z.string().min(1)
});

export const patchIndicatorLifecycleSchema = z.object({
  status: z.enum(["active", "expired", "revoked", "false_positive"]),
  expiresAt: z.string().optional(),
  falsePositiveReason: z.string().optional(),
  owner: z.string().min(1).default("analyst")
});

export type ThreatIntelSource = z.infer<typeof threatIntelSourceSchema>;
export type IndicatorVerdict = z.infer<typeof indicatorVerdictSchema>;
export type IndicatorEnrichment = z.infer<typeof indicatorEnrichmentSchema>;
export type InternalSighting = z.infer<typeof internalSightingSchema>;
export type IndicatorLifecycle = z.infer<typeof indicatorLifecycleSchema>;
export type ThreatContextSummary = z.infer<typeof threatContextSummarySchema>;
export type ThreatIntelEnrichInput = z.infer<typeof threatIntelEnrichSchema>;
export type CreateInternalSightingInput = z.infer<typeof createInternalSightingSchema>;
export type PatchIndicatorLifecycleInput = z.infer<typeof patchIndicatorLifecycleSchema>;
