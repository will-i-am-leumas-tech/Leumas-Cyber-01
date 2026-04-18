import { z } from "zod";
import type { AgentResult, AgentRoleId } from "../schemas/agents.schema";

const parserAgentOutputSchema = z.object({
  artifactCount: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
  entityCount: z.number().int().nonnegative(),
  parserWarningCount: z.number().int().nonnegative()
});

const investigatorAgentOutputSchema = z.object({
  findingIds: z.array(z.string()),
  severity: z.string(),
  category: z.string(),
  summary: z.string().min(1)
});

const retrieverAgentOutputSchema = z.object({
  sourceCount: z.number().int().nonnegative(),
  chunkIds: z.array(z.string()),
  warnings: z.array(z.string())
});

const reporterAgentOutputSchema = z.object({
  reportLength: z.number().int().nonnegative(),
  sectionCount: z.number().int().nonnegative(),
  exportReady: z.boolean()
});

const safetyReviewAgentOutputSchema = z.object({
  allowed: z.boolean(),
  blockedSegments: z.array(z.string()),
  reviewSummary: z.string().min(1)
});

const toolExecutorAgentOutputSchema = z.object({
  allowedTools: z.array(z.string()),
  observedToolCalls: z.number().int().nonnegative(),
  deniedToolCalls: z.number().int().nonnegative()
});

const outputSchemas: Record<AgentRoleId, z.ZodTypeAny> = {
  parser: parserAgentOutputSchema,
  investigator: investigatorAgentOutputSchema,
  retriever: retrieverAgentOutputSchema,
  reporter: reporterAgentOutputSchema,
  safetyReviewer: safetyReviewAgentOutputSchema,
  toolExecutor: toolExecutorAgentOutputSchema
};

export function validateAgentOutput(role: AgentRoleId, output: Record<string, unknown>): { valid: boolean; warnings: string[] } {
  const parsed = outputSchemas[role].safeParse(output);
  if (parsed.success && role === "investigator" && parsed.data.findingIds.length === 0) {
    return {
      valid: false,
      warnings: ["findingIds: At least one evidence-backed finding is required."]
    };
  }

  if (parsed.success) {
    return {
      valid: true,
      warnings: []
    };
  }

  return {
    valid: false,
    warnings: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
  };
}

export function resultPassed(result: AgentResult): boolean {
  return result.validationStatus === "passed" && result.warnings.length === 0;
}
