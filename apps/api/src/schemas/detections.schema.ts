import { z } from "zod";

const detectionSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const detectionIntentSchema = z.object({
  id: z.string(),
  behavior: z.string(),
  category: z.string(),
  severity: detectionSeveritySchema,
  dataSources: z.array(z.string()),
  entities: z.array(z.string()).default([]),
  evidenceRefs: z.array(z.string()),
  createdAt: z.string()
});

export const detectionCoverageSchema = z.object({
  tactic: z.string(),
  technique: z.string(),
  dataSource: z.string(),
  confidence: z.number().min(0).max(1)
});

export const sigmaLikeRuleSchema = z.object({
  title: z.string(),
  id: z.string(),
  status: z.enum(["experimental", "test", "stable"]).default("experimental"),
  description: z.string(),
  logsource: z.object({
    product: z.string(),
    category: z.string(),
    service: z.string().optional()
  }),
  detection: z.object({
    selection: z.record(z.array(z.string())),
    condition: z.literal("selection")
  }),
  fields: z.array(z.string()),
  falsepositives: z.array(z.string()),
  level: detectionSeveritySchema
});

export const detectionRuleSchema = z.object({
  id: z.string(),
  intentId: z.string(),
  format: z.enum(["sigma-like-json", "pseudo-query"]),
  title: z.string(),
  logic: sigmaLikeRuleSchema,
  query: z.string(),
  fields: z.array(z.string()),
  falsePositiveNotes: z.array(z.string()),
  validationStatus: z.enum(["untested", "passed", "failed"]),
  coverage: detectionCoverageSchema,
  exportText: z.string(),
  createdAt: z.string()
});

export const ruleTestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  event: z.record(z.unknown()),
  expectedMatch: z.boolean(),
  reason: z.string()
});

export const ruleTestResultSchema = z.object({
  testCaseId: z.string(),
  expectedMatch: z.boolean(),
  actualMatch: z.boolean(),
  passed: z.boolean(),
  reason: z.string()
});

export const ruleValidationResultSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  schemaStatus: z.enum(["passed", "failed"]),
  fixtureStatus: z.enum(["not_run", "passed", "failed"]),
  warnings: z.array(z.string()).default([]),
  passed: z.boolean(),
  testResults: z.array(ruleTestResultSchema).default([]),
  createdAt: z.string()
});

export type DetectionIntent = z.infer<typeof detectionIntentSchema>;
export type DetectionCoverage = z.infer<typeof detectionCoverageSchema>;
export type SigmaLikeRule = z.infer<typeof sigmaLikeRuleSchema>;
export type DetectionRule = z.infer<typeof detectionRuleSchema>;
export type RuleTestCase = z.infer<typeof ruleTestCaseSchema>;
export type RuleTestResult = z.infer<typeof ruleTestResultSchema>;
export type RuleValidationResult = z.infer<typeof ruleValidationResultSchema>;
