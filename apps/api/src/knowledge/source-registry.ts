import type { KnowledgeSource } from "../schemas/knowledge.schema";
import type { KnowledgeSourceRecord } from "../schemas/knowledge-v2.schema";

export function sourceRecordFromKnowledgeSource(source: KnowledgeSource): KnowledgeSourceRecord {
  return {
    id: source.id,
    owner: source.owner ?? "knowledge-owner",
    tenantId: source.tenantId,
    trustTier: source.trustTier,
    freshnessDate: source.reviewAt,
    approvalState: source.approvalState,
    taxonomyTags: source.taxonomyTags,
    reviewAt: source.reviewAt
  };
}
