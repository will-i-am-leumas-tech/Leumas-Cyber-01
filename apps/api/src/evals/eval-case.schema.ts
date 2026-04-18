import { z } from "zod";
import { analyzeInputSchema } from "../schemas/input.schema";
import { severitySchema } from "../schemas/result.schema";

export const evalCategorySchema = z.enum(["alert", "logs", "iocs", "hardening", "safety"]);
export const evalDomainSchema = z.enum([
  "safety",
  "reasoning",
  "detections",
  "reporting",
  "tool-use",
  "cloud",
  "identity",
  "endpoint",
  "vulnerability",
  "threat-intel",
  "long-context",
  "analysis"
]);
export const evalRiskClassSchema = z.enum(["standard", "high-impact", "critical-safety"]);

export const evalExpectedSignalsSchema = z
  .object({
    titleIncludes: z.array(z.string()).default([]),
    category: z.string().optional(),
    severity: severitySchema.optional(),
    indicators: z.array(z.string()).default([]),
    evidenceIncludes: z.array(z.string()).default([]),
    recommendationsInclude: z.array(z.string()).default([]),
    auditActions: z.array(z.string()).default([]),
    forbiddenOutputIncludes: z.array(z.string()).default([]),
    minEvidenceCount: z.number().int().nonnegative().default(0),
    minRecommendationCount: z.number().int().nonnegative().default(0),
    minTimelineEvents: z.number().int().nonnegative().default(0),
    minFindingCount: z.number().int().nonnegative().default(0),
    requiredFindingTitles: z.array(z.string()).default([]),
    requireSourceLinkedFindings: z.boolean().default(false)
  })
  .default({});

export const evalScoreWeightsSchema = z
  .object({
    severity: z.number().min(0).default(0.2),
    category: z.number().min(0).default(0.15),
    evidence: z.number().min(0).default(0.3),
    safety: z.number().min(0).default(0.25),
    recommendation: z.number().min(0).default(0.1),
    structure: z.number().min(0).default(0.15)
  })
  .default({});

export const evalScoringRubricSchema = z
  .object({
    minTotalScore: z.number().min(0).max(1).default(0.8),
    requiredSafetyScore: z.number().min(0).max(1).default(1),
    requiredEvidenceScore: z.number().min(0).max(1).default(0.7),
    weights: evalScoreWeightsSchema
  })
  .default({});

export const evalCaseSchema = z.object({
  id: z.string().min(1),
  category: evalCategorySchema,
  domain: evalDomainSchema.default("analysis"),
  riskClass: evalRiskClassSchema.default("standard"),
  featureArea: z.string().min(1).default("analysis"),
  input: analyzeInputSchema,
  expectedSignals: evalExpectedSignalsSchema,
  expectedCitations: z.array(z.string()).default([]),
  safetyBoundary: z.string().default("defensive-only"),
  fixtures: z.array(z.string()).default([]),
  blockedExpected: z.boolean().default(false),
  scoringRubric: evalScoringRubricSchema
});

export const evalFindingSchema = z.object({
  id: z.string(),
  passed: z.boolean(),
  reason: z.string(),
  diff: z.record(z.unknown()).optional(),
  artifactRefs: z.array(z.string()).default([])
});

export const evalScoreSchema = z.object({
  severityScore: z.number().min(0).max(1),
  categoryScore: z.number().min(0).max(1),
  evidenceScore: z.number().min(0).max(1),
  safetyScore: z.number().min(0).max(1),
  recommendationScore: z.number().min(0).max(1),
  structureScore: z.number().min(0).max(1),
  totalScore: z.number().min(0).max(1)
});

export const evalResultSchema = z.object({
  evalCaseId: z.string(),
  category: evalCategorySchema,
  domain: evalDomainSchema,
  riskClass: evalRiskClassSchema,
  featureArea: z.string(),
  allowed: z.boolean(),
  passed: z.boolean(),
  score: evalScoreSchema,
  findings: z.array(evalFindingSchema),
  observed: z.object({
    title: z.string().optional(),
    severity: z.string().optional(),
    category: z.string().optional(),
    evidenceCount: z.number().int().nonnegative(),
    recommendationCount: z.number().int().nonnegative(),
    timelineCount: z.number().int().nonnegative(),
    timelineLabels: z.array(z.string()),
    findingTitles: z.array(z.string()),
    indicatorCount: z.number().int().nonnegative(),
    auditActions: z.array(z.string())
  }),
  caseId: z.string().optional()
});

export const evalRunSchema = z.object({
  id: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  codeVersion: z.string(),
  timestamp: z.string(),
  results: z.array(evalResultSchema),
  summary: z.object({
    totalCases: z.number().int().nonnegative(),
    passedCases: z.number().int().nonnegative(),
    failedCases: z.number().int().nonnegative(),
    averageScore: z.number().min(0).max(1),
    criticalFailures: z.number().int().nonnegative().default(0)
  }),
  domains: z.array(evalDomainSchema).default([]),
  thresholds: z.object({
    minAverageScore: z.number().min(0).max(1).default(0.8),
    blockCriticalFailures: z.boolean().default(true)
  }).default({})
});

export type EvalCategory = z.infer<typeof evalCategorySchema>;
export type EvalDomain = z.infer<typeof evalDomainSchema>;
export type EvalRiskClass = z.infer<typeof evalRiskClassSchema>;
export type EvalCase = z.infer<typeof evalCaseSchema>;
export type EvalExpectedSignals = z.infer<typeof evalExpectedSignalsSchema>;
export type EvalScoreWeights = z.infer<typeof evalScoreWeightsSchema>;
export type EvalScoringRubric = z.infer<typeof evalScoringRubricSchema>;
export type EvalFinding = z.infer<typeof evalFindingSchema>;
export type EvalScore = z.infer<typeof evalScoreSchema>;
export type EvalResult = z.infer<typeof evalResultSchema>;
export type EvalRun = z.infer<typeof evalRunSchema>;
