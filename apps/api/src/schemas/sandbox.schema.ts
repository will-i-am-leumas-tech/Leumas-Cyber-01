import { z } from "zod";

export const sandboxRunStatusSchema = z.enum(["planned", "denied", "approval_required", "running", "completed", "failed", "timed_out"]);
export const sandboxArtifactTypeSchema = z.enum(["stdout", "stderr", "result", "file", "policy"]);
export const sandboxRedactionStatusSchema = z.enum(["not_required", "redacted"]);

export const sandboxNetworkPolicySchema = z.object({
  mode: z.enum(["none", "allowlist"]),
  allowedTargets: z.array(z.string()).default([])
});

export const sandboxWritePolicySchema = z.object({
  mode: z.enum(["none", "artifact-only", "scoped-path"]),
  allowedPaths: z.array(z.string()).default([])
});

export const sandboxResourceLimitsSchema = z.object({
  timeoutMs: z.number().int().positive().max(30000),
  maxOutputBytes: z.number().int().positive().max(1024 * 1024),
  maxRecords: z.number().int().positive().max(10000),
  cpuShare: z.number().positive().max(1).default(0.25),
  memoryMb: z.number().int().positive().max(2048).default(128)
});

export const sandboxArtifactPolicySchema = z.object({
  captureStdout: z.boolean().default(true),
  captureStderr: z.boolean().default(true),
  captureResultSummary: z.boolean().default(true),
  redactSecrets: z.boolean().default(true),
  retainForDays: z.number().int().positive().default(14)
});

export const toolManifestSchema = z.object({
  id: z.string(),
  connectorId: z.string(),
  operation: z.string(),
  displayName: z.string(),
  description: z.string(),
  permission: z.enum(["read-only", "write", "high-impact"]),
  allowedInputs: z.array(z.string()).default([]),
  network: sandboxNetworkPolicySchema,
  writes: sandboxWritePolicySchema,
  resources: sandboxResourceLimitsSchema,
  artifacts: sandboxArtifactPolicySchema,
  approvalRequired: z.boolean().default(false),
  enabled: z.boolean().default(true)
});

export const egressDecisionSchema = z.object({
  id: z.string(),
  runId: z.string(),
  destination: z.string().optional(),
  allowed: z.boolean(),
  reason: z.string(),
  policyVersion: z.string(),
  createdAt: z.string()
});

export const sandboxArtifactSchema = z.object({
  id: z.string(),
  runId: z.string(),
  type: sandboxArtifactTypeSchema,
  ref: z.string(),
  hash: z.string(),
  redactionStatus: sandboxRedactionStatusSchema,
  size: z.number().int().nonnegative(),
  summary: z.string(),
  createdAt: z.string()
});

export const sandboxRunSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  manifestId: z.string(),
  actor: z.string(),
  status: sandboxRunStatusSchema,
  dryRun: z.boolean(),
  approvalId: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  parametersHash: z.string(),
  policyDecision: z.object({
    allowed: z.boolean(),
    reason: z.string(),
    approvalRequired: z.boolean()
  }),
  egressDecision: egressDecisionSchema.optional(),
  artifactIds: z.array(z.string()).default([]),
  summary: z.string()
});

export const createSandboxRunSchema = z.object({
  caseId: z.string().optional(),
  manifestId: z.string().min(1),
  actor: z.string().min(1).default("analyst"),
  parameters: z.record(z.unknown()).default({}),
  dryRun: z.boolean().default(true),
  approvalId: z.string().optional()
});

export const approveSandboxRunSchema = z.object({
  approver: z.string().min(1),
  reason: z.string().min(1),
  approved: z.boolean()
});

export type SandboxRunStatus = z.infer<typeof sandboxRunStatusSchema>;
export type SandboxArtifactType = z.infer<typeof sandboxArtifactTypeSchema>;
export type SandboxNetworkPolicy = z.infer<typeof sandboxNetworkPolicySchema>;
export type SandboxWritePolicy = z.infer<typeof sandboxWritePolicySchema>;
export type SandboxResourceLimits = z.infer<typeof sandboxResourceLimitsSchema>;
export type SandboxArtifactPolicy = z.infer<typeof sandboxArtifactPolicySchema>;
export type ToolManifest = z.infer<typeof toolManifestSchema>;
export type EgressDecision = z.infer<typeof egressDecisionSchema>;
export type SandboxArtifact = z.infer<typeof sandboxArtifactSchema>;
export type SandboxRun = z.infer<typeof sandboxRunSchema>;
export type CreateSandboxRunInput = z.infer<typeof createSandboxRunSchema>;
export type ApproveSandboxRunInput = z.infer<typeof approveSandboxRunSchema>;
