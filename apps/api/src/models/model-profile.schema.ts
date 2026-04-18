import { z } from "zod";
import { providerCapabilitySchema, providerTypeSchema } from "../schemas/providers.schema";

export const modelTierSchema = z.enum(["mock", "local", "frontier", "compatible"]);

export const modelProfileSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  label: z.string(),
  type: providerTypeSchema,
  model: z.string(),
  tier: modelTierSchema,
  enabled: z.boolean(),
  capabilities: z.array(providerCapabilitySchema),
  contextWindowTokens: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  supportsStructuredOutput: z.boolean(),
  supportsToolUse: z.boolean(),
  latencyTargetMs: z.number().int().positive(),
  safetyReviewRequired: z.boolean(),
  dataResidency: z.string(),
  notes: z.array(z.string()).default([])
});

export type ModelTier = z.infer<typeof modelTierSchema>;
export type ModelProfile = z.infer<typeof modelProfileSchema>;
