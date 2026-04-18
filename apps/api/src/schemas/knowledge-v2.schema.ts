import { z } from "zod";
import { trustTierSchema } from "./knowledge.schema";

export const knowledgeApprovalStateSchema = z.enum(["draft", "approved", "rejected", "retired", "quarantined"]);

export const knowledgeSourceRecordSchema = z.object({
  id: z.string(),
  owner: z.string(),
  tenantId: z.string().default("tenant_default"),
  trustTier: trustTierSchema,
  freshnessDate: z.string().optional(),
  approvalState: knowledgeApprovalStateSchema,
  taxonomyTags: z.array(z.string()).default([]),
  reviewAt: z.string().optional()
});

export const citationQualitySchema = z.object({
  citationId: z.string(),
  sourceId: z.string(),
  relevance: z.number().min(0).max(1),
  freshness: z.number().min(0).max(1),
  trust: z.number().min(0).max(1),
  warnings: z.array(z.string()).default([])
});

export const knowledgeApprovalSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  reviewer: z.string(),
  status: knowledgeApprovalStateSchema,
  reason: z.string(),
  timestamp: z.string()
});

export const taxonomyMappingSchema = z.object({
  id: z.string(),
  targetRef: z.string(),
  framework: z.enum(["ATTACK", "D3FEND", "CAPEC", "CWE", "CVE", "VENDOR"]),
  objectId: z.string(),
  confidence: z.number().min(0).max(1)
});

export const patchKnowledgeApprovalSchema = z.object({
  reviewer: z.string().min(1),
  status: knowledgeApprovalStateSchema,
  reason: z.string().min(1)
});

export type KnowledgeApprovalState = z.infer<typeof knowledgeApprovalStateSchema>;
export type KnowledgeSourceRecord = z.infer<typeof knowledgeSourceRecordSchema>;
export type CitationQuality = z.infer<typeof citationQualitySchema>;
export type KnowledgeApproval = z.infer<typeof knowledgeApprovalSchema>;
export type TaxonomyMapping = z.infer<typeof taxonomyMappingSchema>;
export type PatchKnowledgeApprovalInput = z.infer<typeof patchKnowledgeApprovalSchema>;
