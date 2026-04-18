import type { KnowledgeSource, RetrievalResult } from "../schemas/knowledge.schema";
import type { CitationQuality } from "../schemas/knowledge-v2.schema";
import { trustTierWeight } from "./source-policy";
import { freshnessStatus } from "./source-freshness-service";

export function scoreCitationQuality(result: RetrievalResult, source: KnowledgeSource): CitationQuality {
  const freshness = freshnessStatus(source);
  const trust = Math.min(1, trustTierWeight(source) / 1.2);
  const relevance = Math.min(1, result.score);
  const warnings = [
    ...freshness.warnings,
    ...(trust < 0.8 ? [`Source "${source.title}" has lower trust tier ${source.trustTier}.`] : [])
  ];

  return {
    citationId: result.chunkId,
    sourceId: source.id,
    relevance,
    freshness: freshness.score,
    trust,
    warnings
  };
}
