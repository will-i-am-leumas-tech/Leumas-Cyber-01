import { z } from "zod";

export const providerTypeSchema = z.enum(["mock", "ollama", "openai-compatible"]);
export const providerCapabilitySchema = z.enum(["streaming", "json_schema", "tool_calling", "local_only"]);
export const providerCallStatusSchema = z.enum(["completed", "blocked", "failed"]);
export const structuredOutputValidationStatusSchema = z.enum(["passed", "failed", "not_provided"]);

export const providerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: providerTypeSchema,
  model: z.string(),
  endpoint: z.string().optional(),
  enabled: z.boolean(),
  capabilities: z.array(providerCapabilitySchema),
  priority: z.number().int().nonnegative()
});

export const providerTokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative()
});

export const providerCallSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  taskType: z.string(),
  status: providerCallStatusSchema,
  latencyMs: z.number().int().nonnegative(),
  tokens: providerTokenUsageSchema,
  startedAt: z.string(),
  completedAt: z.string(),
  errorSummary: z.string().optional()
});

export const structuredOutputValidationSchema = z.object({
  id: z.string(),
  providerCallId: z.string(),
  schemaName: z.string(),
  status: structuredOutputValidationStatusSchema,
  reason: z.string(),
  createdAt: z.string()
});

export const usageRecordSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  taskType: z.string(),
  status: providerCallStatusSchema,
  totalTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  createdAt: z.string()
});

export const providerHealthSchema = z.object({
  provider: z.string(),
  model: z.string(),
  status: z.enum(["healthy", "degraded", "disabled"]),
  latencyMs: z.number().int().nonnegative(),
  checkedAt: z.string(),
  message: z.string()
});

export const providerUsageSummarySchema = z.object({
  provider: z.string(),
  model: z.string(),
  calls: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  averageLatencyMs: z.number().nonnegative()
});

export type ProviderType = z.infer<typeof providerTypeSchema>;
export type ProviderCapability = z.infer<typeof providerCapabilitySchema>;
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type ProviderCallStatus = z.infer<typeof providerCallStatusSchema>;
export type ProviderTokenUsage = z.infer<typeof providerTokenUsageSchema>;
export type ProviderCall = z.infer<typeof providerCallSchema>;
export type StructuredOutputValidation = z.infer<typeof structuredOutputValidationSchema>;
export type UsageRecord = z.infer<typeof usageRecordSchema>;
export type ProviderHealth = z.infer<typeof providerHealthSchema>;
export type ProviderUsageSummary = z.infer<typeof providerUsageSummarySchema>;
