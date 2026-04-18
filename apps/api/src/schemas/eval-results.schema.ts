import { z } from "zod";
import { evalDomainSchema, evalResultSchema, evalRunSchema } from "../evals/eval-case.schema";

export const evalGradeSchema = z.object({
  id: z.string(),
  evalCaseId: z.string(),
  grader: z.string(),
  score: z.number().min(0).max(1),
  passed: z.boolean(),
  criticalFailure: z.boolean(),
  explanation: z.string(),
  evidence: z.array(z.string()).default([]),
  graderVersion: z.string()
});

export const evalRunV2Schema = evalRunSchema.extend({
  taxonomyVersion: z.string(),
  grades: z.array(evalGradeSchema).default([]),
  domainScores: z.record(z.number().min(0).max(1)).default({}),
  trend: z
    .object({
      previousAverageScore: z.number().min(0).max(1).optional(),
      delta: z.number(),
      regression: z.boolean()
    })
    .optional()
});

export const providerComparisonScoreSchema = z.object({
  providerId: z.string(),
  domainScores: z.record(z.number().min(0).max(1)),
  safetyFailures: z.number().int().nonnegative(),
  groundingFailures: z.number().int().nonnegative(),
  averageScore: z.number().min(0).max(1)
});

export const providerComparisonRunSchema = z.object({
  id: z.string(),
  domains: z.array(evalDomainSchema),
  providerScores: z.array(providerComparisonScoreSchema),
  results: z.array(evalResultSchema),
  createdAt: z.string()
});

export type EvalGrade = z.infer<typeof evalGradeSchema>;
export type EvalRunV2 = z.infer<typeof evalRunV2Schema>;
export type ProviderComparisonScore = z.infer<typeof providerComparisonScoreSchema>;
export type ProviderComparisonRun = z.infer<typeof providerComparisonRunSchema>;
