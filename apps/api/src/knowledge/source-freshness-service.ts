import type { KnowledgeSource } from "../schemas/knowledge.schema";
import { isKnowledgeSourceStale } from "./source-policy";

const dayMs = 24 * 60 * 60 * 1000;

export function freshnessScore(source: KnowledgeSource, now = new Date()): number {
  if (!source.reviewAt) {
    return 0.75;
  }
  const reviewAt = Date.parse(source.reviewAt);
  if (!Number.isFinite(reviewAt)) {
    return 0;
  }
  const daysUntilReview = Math.floor((reviewAt - now.getTime()) / dayMs);
  if (daysUntilReview < 0) {
    return 0.2;
  }
  return Math.min(1, Math.max(0.35, daysUntilReview / 180));
}

export function freshnessStatus(source: KnowledgeSource, now = new Date()): {
  stale: boolean;
  score: number;
  warnings: string[];
} {
  const stale = isKnowledgeSourceStale(source, now);
  return {
    stale,
    score: freshnessScore(source, now),
    warnings: stale ? [`Source "${source.title}" is past its review date.`] : []
  };
}
