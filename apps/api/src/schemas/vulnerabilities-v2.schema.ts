import { z } from "zod";
import { vulnerabilityPrioritySchema } from "./vulnerabilities.schema";

export const vulnerabilityEnrichmentSchema = z.object({
  findingId: z.string(),
  cve: z.string(),
  cwe: z.array(z.string()).default([]),
  cvss: z.number().min(0).max(10).optional(),
  epss: z.number().min(0).max(1).default(0),
  kev: z.boolean().default(false),
  advisoryRefs: z.array(z.string()).default([]),
  patchRefs: z.array(z.string()).default([]),
  mitigationRefs: z.array(z.string()).default([]),
  publishedAt: z.string().optional(),
  lastModifiedAt: z.string().optional(),
  source: z.string().default("local-fixture"),
  createdAt: z.string()
});

export const assetExposureV2Schema = z.object({
  assetId: z.string(),
  assetName: z.string(),
  owner: z.string(),
  businessCriticality: vulnerabilityPrioritySchema,
  internetExposure: z.boolean(),
  environment: z.enum(["production", "staging", "development", "lab", "unknown"]).default("unknown"),
  exposurePaths: z.array(z.string()).default([]),
  controlCoverage: z.array(z.string()).default([]),
  compensatingControls: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const riskFactorSchema = z.object({
  name: z.string(),
  impact: z.number(),
  explanation: z.string()
});

export const riskScoreV2Schema = z.object({
  findingId: z.string(),
  score: z.number().min(0).max(100),
  priority: vulnerabilityPrioritySchema,
  factors: z.array(riskFactorSchema),
  explanation: z.string(),
  staleDataWarnings: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const vulnerabilitySlaSchema = z.object({
  findingId: z.string(),
  owner: z.string(),
  dueDate: z.string(),
  status: z.enum(["on_track", "due_soon", "breached", "paused"]),
  escalationPath: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const updateVulnerabilitySlaSchema = z.object({
  owner: z.string().min(1).optional(),
  dueDate: z.string().min(1).optional(),
  status: z.enum(["on_track", "due_soon", "breached", "paused"]).optional(),
  escalationPath: z.array(z.string().min(1)).optional()
});

export const remediationValidationSchema = z.object({
  id: z.string(),
  findingId: z.string(),
  evidenceSource: z.string(),
  status: z.enum(["validated", "not_fixed", "partial", "accepted_risk"]),
  timestamp: z.string(),
  residualRisk: vulnerabilityPrioritySchema,
  evidenceRefs: z.array(z.string()).default([]),
  notes: z.string().optional()
});

export const createRemediationValidationSchema = z.object({
  evidenceSource: z.string().min(1),
  observedScannerStatus: z.enum(["fixed", "still_present", "partially_fixed", "accepted_risk"]),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  notes: z.string().optional()
});

export const scannerDeltaFindingSchema = z.object({
  cve: z.string().min(1),
  title: z.string().min(1),
  scanner: z.string().min(1),
  assetId: z.string().min(1),
  assetName: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  evidence: z.string().min(1),
  firstSeen: z.string().min(1),
  lastSeen: z.string().min(1).optional(),
  status: z.enum(["open", "resolved"]).default("open"),
  epss: z.number().min(0).max(1).default(0),
  kev: z.boolean().default(false),
  cvss: z.number().min(0).max(10).optional(),
  vendorAdvisory: z.string().optional(),
  exposure: z.enum(["internet", "internal", "isolated"]).default("internal"),
  exploitMaturity: z.enum(["none", "poc", "active", "unknown"]).default("unknown"),
  exploitMaturitySummary: z.string().default("No exploit reproduction was requested or provided.")
});

export const scannerDeltaImportSchema = z.object({
  findings: z.array(scannerDeltaFindingSchema).min(1),
  assetExposure: z.array(assetExposureV2Schema.omit({ createdAt: true, updatedAt: true })).default([])
});

export const scannerDeltaResultSchema = z.object({
  createdFindingIds: z.array(z.string()),
  updatedFindingIds: z.array(z.string()),
  resolvedFindingIds: z.array(z.string()),
  importedAt: z.string()
});

export const vulnerabilityDashboardSchema = z.object({
  totalFindings: z.number().int().nonnegative(),
  openFindings: z.number().int().nonnegative(),
  validatedRemediations: z.number().int().nonnegative(),
  priorityCounts: z.record(z.number().int().nonnegative()),
  slaCounts: z.record(z.number().int().nonnegative()),
  topRisks: z.array(riskScoreV2Schema),
  exceptionCounts: z.record(z.number().int().nonnegative())
});

export type VulnerabilityEnrichment = z.infer<typeof vulnerabilityEnrichmentSchema>;
export type AssetExposureV2 = z.infer<typeof assetExposureV2Schema>;
export type RiskFactor = z.infer<typeof riskFactorSchema>;
export type RiskScoreV2 = z.infer<typeof riskScoreV2Schema>;
export type VulnerabilitySla = z.infer<typeof vulnerabilitySlaSchema>;
export type UpdateVulnerabilitySlaInput = z.infer<typeof updateVulnerabilitySlaSchema>;
export type RemediationValidation = z.infer<typeof remediationValidationSchema>;
export type CreateRemediationValidationInput = z.infer<typeof createRemediationValidationSchema>;
export type ScannerDeltaFinding = z.infer<typeof scannerDeltaFindingSchema>;
export type ScannerDeltaImportInput = z.infer<typeof scannerDeltaImportSchema>;
export type ScannerDeltaResult = z.infer<typeof scannerDeltaResultSchema>;
export type VulnerabilityDashboard = z.infer<typeof vulnerabilityDashboardSchema>;
