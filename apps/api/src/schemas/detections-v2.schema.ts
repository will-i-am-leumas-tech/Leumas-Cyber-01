import { z } from "zod";

export const detectionRuleFormatSchema = z.enum([
  "sigma-like-json",
  "sigma",
  "kql",
  "spl",
  "yara",
  "eql",
  "lucene",
  "suricata",
  "snort"
]);

export const detectionLifecycleStatusSchema = z.enum(["draft", "validated", "testing", "ready", "deployed", "retired"]);

export const detectionRuleMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  owner: z.string().default("detection-engineering"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  evidenceIds: z.array(z.string()).default([]),
  attackTechniques: z.array(z.string()).default([]),
  dataSources: z.array(z.string()).default([]),
  version: z.string().default("1.0.0"),
  createdAt: z.string()
});

export const detectionRuleV2Schema = z.object({
  id: z.string(),
  sourceRuleId: z.string(),
  intentId: z.string(),
  format: detectionRuleFormatSchema,
  content: z.string(),
  metadata: detectionRuleMetadataSchema,
  status: detectionLifecycleStatusSchema.default("draft"),
  validationIds: z.array(z.string()).default([]),
  corpusItemIds: z.array(z.string()).default([]),
  deploymentIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const detectionCorpusItemSchema = z.object({
  id: z.string(),
  label: z.enum(["positive", "negative", "benign"]),
  source: z.string(),
  expectedMatch: z.boolean(),
  eventData: z.record(z.unknown()),
  tags: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const detectionRuleValidationV2Schema = z.object({
  id: z.string(),
  ruleId: z.string(),
  format: detectionRuleFormatSchema,
  syntaxStatus: z.enum(["passed", "failed"]),
  safetyStatus: z.enum(["passed", "failed"]),
  backendStatus: z.enum(["not_run", "passed", "failed"]),
  warnings: z.array(z.string()).default([]),
  passed: z.boolean(),
  createdAt: z.string()
});

export const corpusTestResultSchema = z.object({
  corpusItemId: z.string(),
  expectedMatch: z.boolean(),
  actualMatch: z.boolean(),
  passed: z.boolean(),
  reason: z.string()
});

export const corpusRunResultSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  passed: z.boolean(),
  results: z.array(corpusTestResultSchema),
  createdAt: z.string()
});

export const falsePositiveSimulationResultSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  benignCorpusMatches: z.number().int().nonnegative(),
  benignCorpusTotal: z.number().int().nonnegative(),
  riskScore: z.number().min(0).max(1),
  matchedCorpusItemIds: z.array(z.string()).default([]),
  tuningSuggestions: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const detectionDeploymentSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  backend: z.string(),
  version: z.string(),
  status: z.enum(["planned", "deployed", "failed", "drifted", "retired"]),
  owner: z.string(),
  driftStatus: z.enum(["not_checked", "in_sync", "drifted"]).default("not_checked"),
  deployedAt: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const detectionDeploymentRequestSchema = z.object({
  backend: z.string().min(1),
  version: z.string().min(1).default("1.0.0"),
  status: z.enum(["planned", "deployed", "failed", "drifted", "retired"]).default("planned"),
  owner: z.string().min(1).default("detection-engineering"),
  driftStatus: z.enum(["not_checked", "in_sync", "drifted"]).default("not_checked"),
  notes: z.string().optional()
});

export const detectionRuleValidationRequestSchema = z.object({
  format: detectionRuleFormatSchema.optional()
});

export const detectionCorpusRunRequestSchema = z.object({
  corpusItems: z.array(detectionCorpusItemSchema.omit({ id: true, createdAt: true })).default([])
});

export const coverageSummarySchema = z.object({
  totalRules: z.number().int().nonnegative(),
  formats: z.record(z.number().int().nonnegative()),
  techniques: z.record(z.number().int().nonnegative()),
  dataSources: z.record(z.number().int().nonnegative()),
  deploymentStatuses: z.record(z.number().int().nonnegative())
});

export type DetectionRuleFormat = z.infer<typeof detectionRuleFormatSchema>;
export type DetectionLifecycleStatus = z.infer<typeof detectionLifecycleStatusSchema>;
export type DetectionRuleMetadata = z.infer<typeof detectionRuleMetadataSchema>;
export type DetectionRuleV2 = z.infer<typeof detectionRuleV2Schema>;
export type DetectionCorpusItem = z.infer<typeof detectionCorpusItemSchema>;
export type DetectionRuleValidationV2 = z.infer<typeof detectionRuleValidationV2Schema>;
export type CorpusTestResult = z.infer<typeof corpusTestResultSchema>;
export type CorpusRunResult = z.infer<typeof corpusRunResultSchema>;
export type FalsePositiveSimulationResult = z.infer<typeof falsePositiveSimulationResultSchema>;
export type DetectionDeployment = z.infer<typeof detectionDeploymentSchema>;
export type DetectionDeploymentRequest = z.infer<typeof detectionDeploymentRequestSchema>;
export type DetectionRuleValidationRequest = z.infer<typeof detectionRuleValidationRequestSchema>;
export type DetectionCorpusRunRequest = z.infer<typeof detectionCorpusRunRequestSchema>;
export type CoverageSummary = z.infer<typeof coverageSummarySchema>;
