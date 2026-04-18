import { z } from "zod";

export const operationalMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  labels: z.record(z.string()).default({}),
  timestamp: z.string()
});

export const traceContextSchema = z.object({
  requestId: z.string(),
  caseId: z.string().optional(),
  spanId: z.string(),
  parentSpanId: z.string().optional()
});

export const healthCheckResultSchema = z.object({
  dependency: z.string(),
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  latencyMs: z.number().nonnegative(),
  errorSummary: z.string().optional()
});

export const retryPolicySchema = z.object({
  maxAttempts: z.number().int().positive(),
  backoffMs: z.number().int().nonnegative(),
  idempotencyKey: z.string(),
  deadLetter: z.boolean().default(true)
});

export const errorEventSchema = z.object({
  id: z.string(),
  component: z.string(),
  severity: z.enum(["info", "warning", "error", "critical"]),
  sanitizedError: z.string(),
  requestId: z.string(),
  timestamp: z.string()
});

export type OperationalMetric = z.infer<typeof operationalMetricSchema>;
export type TraceContext = z.infer<typeof traceContextSchema>;
export type HealthCheckResult = z.infer<typeof healthCheckResultSchema>;
export type RetryPolicy = z.infer<typeof retryPolicySchema>;
export type ErrorEvent = z.infer<typeof errorEventSchema>;
