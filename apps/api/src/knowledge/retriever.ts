import type { KnowledgeChunk, KnowledgeSource, RetrievalQuery, RetrievalResult } from "../schemas/knowledge.schema";
import { isKnowledgeSourceStale, trustTierWeight } from "./source-policy";

const stopWords = new Set(["and", "are", "for", "from", "how", "the", "this", "that", "with", "your", "into", "what"]);

function queryTokens(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .match(/[a-z0-9][a-z0-9.-]{2,}/g)
        ?.filter((token) => !stopWords.has(token)) ?? []
    )
  ];
}

function excerptForChunk(chunk: KnowledgeChunk, tokens: string[]): string {
  const sentences = chunk.text.split(/(?<=[.!?])\s+/);
  const best = sentences.find((sentence) => tokens.some((token) => sentence.toLowerCase().includes(token)));
  return (best ?? chunk.text).slice(0, 360);
}

export function retrieveKnowledge(input: {
  query: RetrievalQuery;
  sources: KnowledgeSource[];
  chunks: KnowledgeChunk[];
  now?: Date;
}): RetrievalResult[] {
  const sourceById = new Map(input.sources.map((source) => [source.id, source]));
  const tokens = queryTokens(`${input.query.task ?? ""} ${input.query.query}`);
  const sourceFilter = new Set(input.query.filters?.sourceIds ?? []);
  const trustFilter = new Set(input.query.filters?.trustTiers ?? []);

  const scored = input.chunks
    .map((chunk) => {
      const source = sourceById.get(chunk.sourceId);
      if (!source) {
        return null;
      }

      if (sourceFilter.size > 0 && !sourceFilter.has(source.id)) {
        return null;
      }

      if (trustFilter.size > 0 && !trustFilter.has(source.trustTier)) {
        return null;
      }

      const matchedTokens = tokens.filter((token) => chunk.searchText.includes(token));
      if (matchedTokens.length === 0) {
        return null;
      }

      const density = matchedTokens.length / Math.max(tokens.length, 1);
      const tagBoost = matchedTokens.filter((token) => chunk.tags.includes(token)).length * 0.15;
      const score = Number(((density + tagBoost) * trustTierWeight(source)).toFixed(4));

      return {
        chunk,
        source,
        score,
        matchedTokens
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((a, b) => b.score - a.score || a.chunk.location.localeCompare(b.chunk.location))
    .slice(0, input.query.limit);

  return scored.map(({ chunk, source, score, matchedTokens }) => ({
    chunkId: chunk.id,
    score,
    excerpt: excerptForChunk(chunk, matchedTokens),
    citation: {
      sourceId: source.id,
      title: source.title,
      uri: source.uri,
      location: chunk.location,
      trustTier: source.trustTier,
      version: source.version,
      reviewAt: source.reviewAt,
      stale: isKnowledgeSourceStale(source, input.now)
    }
  }));
}
