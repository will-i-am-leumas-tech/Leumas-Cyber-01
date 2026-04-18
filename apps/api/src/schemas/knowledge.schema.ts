import { z } from "zod";

export const trustTierSchema = z.enum(["internal", "standard", "vendor", "community"]);

export const knowledgeSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  uri: z.string(),
  type: z.enum(["markdown", "text"]),
  trustTier: trustTierSchema,
  owner: z.string().optional(),
  tenantId: z.string().default("tenant_default"),
  approvalState: z.enum(["draft", "approved", "rejected", "retired", "quarantined"]).default("approved"),
  taxonomyTags: z.array(z.string()).default([]),
  version: z.string(),
  reviewAt: z.string().optional(),
  createdAt: z.string(),
  hash: z.string()
});

export const knowledgeChunkSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  text: z.string(),
  location: z.string(),
  tags: z.array(z.string()),
  searchText: z.string(),
  hash: z.string()
});

export const knowledgeCitationSchema = z.object({
  sourceId: z.string(),
  title: z.string(),
  uri: z.string(),
  location: z.string(),
  trustTier: trustTierSchema,
  version: z.string(),
  reviewAt: z.string().optional(),
  stale: z.boolean()
});

export const retrievalResultSchema = z.object({
  chunkId: z.string(),
  score: z.number().min(0),
  excerpt: z.string(),
  citation: knowledgeCitationSchema,
  citationQuality: z.unknown().optional()
});

export const retrievalSnapshotSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  query: z.string(),
  resultChunkIds: z.array(z.string()),
  createdAt: z.string(),
  promptIncluded: z.boolean()
});

export const knowledgeContextSchema = z.object({
  query: z.string(),
  results: z.array(retrievalResultSchema),
  snapshots: z.array(retrievalSnapshotSchema),
  warnings: z.array(z.string()).default([])
});

export const ingestKnowledgeSourceSchema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(1),
  uri: z.string().min(1).default("local://knowledge-source"),
  type: z.enum(["markdown", "text"]).default("markdown"),
  trustTier: trustTierSchema.default("internal"),
  owner: z.string().max(120).optional(),
  tenantId: z.string().min(1).default("tenant_default"),
  approvalState: z.enum(["draft", "approved", "rejected", "retired", "quarantined"]).default("approved"),
  taxonomyTags: z.array(z.string()).default([]),
  version: z.string().min(1).max(80).default("1"),
  reviewAt: z.string().optional()
});

export const retrievalQuerySchema = z.object({
  query: z.string().min(1),
  task: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(10).default(5),
  filters: z
    .object({
      sourceIds: z.array(z.string()).optional(),
      trustTiers: z.array(trustTierSchema).optional(),
      tenantId: z.string().optional(),
      approvalStates: z.array(z.enum(["draft", "approved", "rejected", "retired", "quarantined"])).optional()
    })
    .optional()
});

export type TrustTier = z.infer<typeof trustTierSchema>;
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;
export type KnowledgeChunk = z.infer<typeof knowledgeChunkSchema>;
export type KnowledgeCitation = z.infer<typeof knowledgeCitationSchema>;
export type RetrievalResult = z.infer<typeof retrievalResultSchema>;
export type RetrievalSnapshot = z.infer<typeof retrievalSnapshotSchema>;
export type KnowledgeContext = z.infer<typeof knowledgeContextSchema>;
export type IngestKnowledgeSourceInput = z.infer<typeof ingestKnowledgeSourceSchema>;
export type RetrievalQuery = z.infer<typeof retrievalQuerySchema>;
