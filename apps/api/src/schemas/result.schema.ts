import { z } from "zod";
import { knowledgeContextSchema } from "./knowledge.schema";
import { ingestionBundleSchema } from "./ingest.schema";
import { reasoningBundleSchema } from "./reasoning.schema";

export const severitySchema = z.enum(["low", "medium", "high", "critical"]);

export const indicatorTypeSchema = z.enum([
  "ipv4",
  "ipv6",
  "domain",
  "url",
  "md5",
  "sha1",
  "sha256",
  "hostname",
  "file_path",
  "registry_key"
]);

export const indicatorSchema = z.object({
  type: indicatorTypeSchema,
  value: z.string(),
  normalized: z.string(),
  source: z.string().optional()
});

export const timelineEventSchema = z.object({
  timestamp: z.string(),
  label: z.string(),
  source: z.string().optional(),
  raw: z.string().optional()
});

export const refusalSchema = z.object({
  allowed: z.literal(false),
  reason: z.enum(["offensive_request_detected", "scope_clarification_required"]),
  safeRedirect: z.string(),
  matchedSignals: z.array(z.string())
});

export const analysisResultSchema = z.object({
  title: z.string(),
  severity: severitySchema,
  confidence: z.number().min(0).max(1),
  category: z.string(),
  summary: z.string(),
  evidence: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  indicators: z.array(indicatorSchema),
  timeline: z.array(timelineEventSchema),
  ingestion: ingestionBundleSchema.optional(),
  knowledge: knowledgeContextSchema.optional(),
  reasoning: reasoningBundleSchema.optional(),
  reportMarkdown: z.string(),
  notes: z.array(z.string()).default([])
});

export type Severity = z.infer<typeof severitySchema>;
export type Indicator = z.infer<typeof indicatorSchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type Refusal = z.infer<typeof refusalSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
