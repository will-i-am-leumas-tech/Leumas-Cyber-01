import { z } from "zod";
import { severitySchema } from "./result.schema";

export const vulnerabilityPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export const exposureSchema = z.enum(["internet", "internal", "isolated"]);
export const exploitMaturitySchema = z.enum(["none", "poc", "active", "unknown"]);

export const vulnerabilityFindingSchema = z.object({
  id: z.string(),
  cve: z.string(),
  title: z.string(),
  scanner: z.string(),
  assetId: z.string(),
  assetName: z.string(),
  severity: severitySchema,
  evidence: z.string(),
  firstSeen: z.string(),
  riskScore: z.number().min(0).max(100),
  priority: vulnerabilityPrioritySchema,
  riskSummary: z.string()
});

export const vulnerabilityContextSchema = z.object({
  findingId: z.string(),
  epss: z.number().min(0).max(1).default(0),
  kev: z.boolean().default(false),
  cvss: z.number().min(0).max(10).optional(),
  vendorAdvisory: z.string().optional(),
  exposure: exposureSchema,
  exploitMaturity: exploitMaturitySchema.default("unknown"),
  exploitMaturitySummary: z.string()
});

export const assetRiskProfileSchema = z.object({
  assetId: z.string(),
  assetName: z.string(),
  businessCriticality: vulnerabilityPrioritySchema,
  internetExposure: z.boolean(),
  owner: z.string(),
  compensatingControls: z.array(z.string()).default([])
});

export const vulnerabilityRemediationTaskSchema = z.object({
  id: z.string(),
  findingId: z.string(),
  action: z.string(),
  owner: z.string(),
  dueDate: z.string(),
  validationMethod: z.string(),
  status: z.enum(["open", "in_progress", "done", "accepted_risk"]),
  createdAt: z.string()
});

export const riskExceptionSchema = z.object({
  id: z.string(),
  findingId: z.string(),
  acceptedRisk: z.string(),
  approver: z.string(),
  expiresAt: z.string(),
  compensatingControls: z.array(z.string()),
  status: z.enum(["active", "expired"]),
  createdAt: z.string()
});

export const scannerFindingInputSchema = z.object({
  cve: z.string().min(1),
  title: z.string().min(1),
  scanner: z.string().min(1),
  assetId: z.string().min(1),
  assetName: z.string().min(1),
  severity: severitySchema,
  evidence: z.string().min(1),
  firstSeen: z.string().min(1),
  epss: z.number().min(0).max(1).default(0),
  kev: z.boolean().default(false),
  cvss: z.number().min(0).max(10).optional(),
  vendorAdvisory: z.string().optional(),
  exposure: exposureSchema.default("internal"),
  exploitMaturity: exploitMaturitySchema.default("unknown"),
  exploitMaturitySummary: z.string().default("No exploit reproduction was requested or provided.")
});

export const vulnerabilityImportSchema = z.object({
  findings: z.array(scannerFindingInputSchema).min(1),
  assetContext: z.array(assetRiskProfileSchema.omit({ assetName: true }).extend({ assetName: z.string().optional() })).default([])
});

export const createVulnerabilityRemediationTaskSchema = z
  .object({
    owner: z.string().min(1).optional(),
    action: z.string().min(1).optional(),
    dueDate: z.string().min(1).optional()
  })
  .default({});

export const createRiskExceptionSchema = z.object({
  acceptedRisk: z.string().min(1),
  approver: z.string().min(1),
  expiresAt: z.string().min(1),
  compensatingControls: z.array(z.string().min(1)).min(1)
});

export type VulnerabilityPriority = z.infer<typeof vulnerabilityPrioritySchema>;
export type Exposure = z.infer<typeof exposureSchema>;
export type ExploitMaturity = z.infer<typeof exploitMaturitySchema>;
export type VulnerabilityFinding = z.infer<typeof vulnerabilityFindingSchema>;
export type VulnerabilityContext = z.infer<typeof vulnerabilityContextSchema>;
export type AssetRiskProfile = z.infer<typeof assetRiskProfileSchema>;
export type VulnerabilityRemediationTask = z.infer<typeof vulnerabilityRemediationTaskSchema>;
export type RiskException = z.infer<typeof riskExceptionSchema>;
export type ScannerFindingInput = z.infer<typeof scannerFindingInputSchema>;
export type VulnerabilityImportInput = z.infer<typeof vulnerabilityImportSchema>;
export type CreateVulnerabilityRemediationTaskInput = z.infer<typeof createVulnerabilityRemediationTaskSchema>;
export type CreateRiskExceptionInput = z.infer<typeof createRiskExceptionSchema>;
