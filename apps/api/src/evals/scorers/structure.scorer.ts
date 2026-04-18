import type { ScorePart, EvalScoringContext } from "./scoring-utils";
import { clampScore, fractionMatched, makeFinding } from "./scoring-utils";

function boolScore(value: boolean): number {
  return value ? 1 : 0;
}

function isMalformedTimelineLabel(label: string): boolean {
  const trimmed = label.trim();
  return trimmed.length === 0 || /^"?(?:timestamp|@timestamp|time|event\.created)"?\s*:\s*"?\s*"?,?$/i.test(trimmed);
}

export function scoreStructure(context: EvalScoringContext): ScorePart {
  if (context.evalCase.blockedExpected) {
    const passed = !context.response.result;
    return {
      score: passed ? 1 : 0,
      findings: [
        makeFinding({
          evalCase: context.evalCase,
          id: "structure",
          passed,
          reason: passed ? "Blocked eval did not produce an analysis result." : "Blocked eval unexpectedly produced an analysis result."
        })
      ]
    };
  }

  const result = context.response.result;
  const reasoning = result?.reasoning;
  const expected = context.evalCase.expectedSignals;
  const findingTitles = reasoning?.findings.map((finding) => finding.title).join("\n") ?? "";
  const malformedTimelineLabels = result?.timeline.filter((event) => isMalformedTimelineLabel(event.label)).map((event) => event.label) ?? [];
  const checks = [
    boolScore(Boolean(result)),
    boolScore((result?.evidence.length ?? 0) >= expected.minEvidenceCount),
    boolScore((result?.recommendedActions.length ?? 0) >= expected.minRecommendationCount),
    boolScore((result?.timeline.length ?? 0) >= expected.minTimelineEvents),
    boolScore(malformedTimelineLabels.length === 0),
    boolScore((reasoning?.findings.length ?? 0) >= expected.minFindingCount),
    fractionMatched(expected.requiredFindingTitles, findingTitles),
    expected.requireSourceLinkedFindings
      ? boolScore(Boolean(reasoning?.findings.every((finding) => finding.evidenceObservationIds.length > 0)))
      : 1
  ];
  const score = clampScore(checks.reduce((sum, item) => sum + item, 0) / checks.length);
  const passed = score === 1;

  return {
    score,
    findings: [
      makeFinding({
        evalCase: context.evalCase,
        id: "structure",
        passed,
        reason: passed ? "Response structure met count and reasoning requirements." : "Response structure missed one or more count or reasoning requirements.",
        diff: {
          expected: {
            minEvidenceCount: expected.minEvidenceCount,
            minRecommendationCount: expected.minRecommendationCount,
            minTimelineEvents: expected.minTimelineEvents,
            minFindingCount: expected.minFindingCount,
            requiredFindingTitles: expected.requiredFindingTitles,
            requireSourceLinkedFindings: expected.requireSourceLinkedFindings
          },
          actual: {
            evidenceCount: result?.evidence.length ?? 0,
            recommendationCount: result?.recommendedActions.length ?? 0,
            timelineCount: result?.timeline.length ?? 0,
            timelineLabels: result?.timeline.map((event) => event.label) ?? [],
            malformedTimelineLabels,
            findingCount: reasoning?.findings.length ?? 0,
            findingTitles: reasoning?.findings.map((finding) => finding.title) ?? [],
            sourceLinkedFindings: reasoning?.findings.map((finding) => ({
              id: finding.id,
              evidenceObservationIds: finding.evidenceObservationIds
            })) ?? []
          },
          score
        }
      })
    ]
  };
}
