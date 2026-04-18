import type { AnalyzePipelineResponse } from "../../pipeline/analyze-pipeline";
import type { EvalCase, EvalFinding } from "../eval-case.schema";

export interface ScorePart {
  score: number;
  findings: EvalFinding[];
}

export interface EvalScoringContext {
  evalCase: EvalCase;
  response: AnalyzePipelineResponse;
}

export function clampScore(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

export function fractionMatched(expected: string[], corpus: string): number {
  if (expected.length === 0) {
    return 1;
  }

  const lowerCorpus = corpus.toLowerCase();
  const matched = expected.filter((item) => lowerCorpus.includes(item.toLowerCase()));
  return matched.length / expected.length;
}

export function resultCorpus(response: AnalyzePipelineResponse): string {
  const result = response.result;
  const reasoning = result?.reasoning;
  const refusal = response.refusal;
  return [
    result?.title,
    result?.category,
    result?.severity,
    result?.summary,
    ...(result?.evidence ?? []),
    ...(result?.recommendedActions ?? []),
    ...(result?.indicators.map((indicator) => `${indicator.type}:${indicator.normalized}`) ?? []),
    ...(result?.timeline.map((event) => `${event.timestamp} ${event.label} ${event.raw ?? ""}`) ?? []),
    ...(reasoning?.findings.map((finding) => `${finding.title} ${finding.reasoningSummary}`) ?? []),
    result?.reportMarkdown,
    refusal?.safeRedirect,
    refusal?.reason,
    ...(refusal?.matchedSignals ?? [])
  ]
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .join("\n");
}

export function makeFinding(input: {
  evalCase: EvalCase;
  id: string;
  passed: boolean;
  reason: string;
  diff?: Record<string, unknown>;
  artifactRefs?: string[];
}): EvalFinding {
  return {
    id: `${input.evalCase.id}:${input.id}`,
    passed: input.passed,
    reason: input.reason,
    diff: input.diff,
    artifactRefs: input.artifactRefs ?? []
  };
}
