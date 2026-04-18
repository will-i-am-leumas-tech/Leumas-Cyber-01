import type { KnowledgeChunk, KnowledgeSource, RetrievalQuery, RetrievalResult } from "../schemas/knowledge.schema";
import { scoreCitationQuality } from "./citation-quality-scorer";
import { freshnessScore } from "./source-freshness-service";
import { retrieveKnowledge } from "./retriever";
import { isKnowledgeSourceApprovedForRetrieval } from "./source-policy";

export function hybridRetrieveKnowledge(input: {
  query: RetrievalQuery;
  sources: KnowledgeSource[];
  chunks: KnowledgeChunk[];
  now?: Date;
}): RetrievalResult[] {
  const allowedSources = input.sources.filter((source) => isKnowledgeSourceApprovedForRetrieval(source, input.query));
  const sourceById = new Map(allowedSources.map((source) => [source.id, source]));
  const allowedChunks = input.chunks.filter((chunk) => sourceById.has(chunk.sourceId));
  const results = retrieveKnowledge({
    query: input.query,
    sources: allowedSources,
    chunks: allowedChunks,
    now: input.now
  });

  return results
    .map((result) => {
      const source = sourceById.get(result.citation.sourceId);
      if (!source) {
        return result;
      }
      const quality = scoreCitationQuality(result, source);
      return {
        ...result,
        score: Number((result.score * freshnessScore(source, input.now) * quality.trust).toFixed(4)),
        citationQuality: quality
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, input.query.limit);
}
