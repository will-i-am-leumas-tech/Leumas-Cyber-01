import { z } from "zod";

export const groundingStatusSchema = z.enum(["supported", "weak", "unsupported"]);

export const groundingFindingSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  claimType: z.enum(["summary", "recommendation", "finding", "severity"]),
  claim: z.string(),
  status: groundingStatusSchema,
  evidenceRefs: z.array(z.string()).default([]),
  reason: z.string(),
  analystReviewRequired: z.boolean(),
  createdAt: z.string()
});

export const providerComparisonProviderResultSchema = z.object({
  provider: z.string(),
  model: z.string(),
  evalRunId: z.string(),
  passedCases: z.number().int().nonnegative(),
  totalCases: z.number().int().nonnegative(),
  averageScore: z.number().min(0).max(1),
  safetyFailures: z.number().int().nonnegative(),
  groundingFailures: z.number().int().nonnegative()
});

export const providerComparisonRunSchema = z.object({
  id: z.string(),
  promptVersion: z.string(),
  codeVersion: z.string(),
  createdAt: z.string(),
  providers: z.array(providerComparisonProviderResultSchema),
  summary: z.object({
    bestProvider: z.string().optional(),
    providerCount: z.number().int().nonnegative(),
    totalCases: z.number().int().nonnegative()
  })
});

export type GroundingStatus = z.infer<typeof groundingStatusSchema>;
export type GroundingFinding = z.infer<typeof groundingFindingSchema>;
export type ProviderComparisonProviderResult = z.infer<typeof providerComparisonProviderResultSchema>;
export type ProviderComparisonRun = z.infer<typeof providerComparisonRunSchema>;
