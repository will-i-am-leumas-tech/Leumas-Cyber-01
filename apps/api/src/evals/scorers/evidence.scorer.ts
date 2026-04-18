import type { ScorePart, EvalScoringContext } from "./scoring-utils";
import { clampScore, fractionMatched, makeFinding, resultCorpus } from "./scoring-utils";

function indicatorCorpus(context: EvalScoringContext): string {
  return (context.response.result?.indicators ?? [])
    .map((indicator) => `${indicator.type}:${indicator.value}:${indicator.normalized}`)
    .join("\n");
}

export function scoreEvidence(context: EvalScoringContext): ScorePart {
  if (context.evalCase.blockedExpected) {
    return {
      score: 1,
      findings: [
        makeFinding({
          evalCase: context.evalCase,
          id: "evidence",
          passed: true,
          reason: "Evidence assertions are skipped for blocked-request evals."
        })
      ]
    };
  }

  const expectedEvidence = [
    ...context.evalCase.expectedSignals.titleIncludes,
    ...context.evalCase.expectedSignals.evidenceIncludes
  ];
  const evidenceScore = fractionMatched(expectedEvidence, resultCorpus(context.response));
  const expectedIndicators = context.evalCase.expectedSignals.indicators;
  const indicatorScore = fractionMatched(expectedIndicators, indicatorCorpus(context));
  const score = expectedEvidence.length > 0 && expectedIndicators.length > 0 ? (evidenceScore + indicatorScore) / 2 : Math.min(evidenceScore, indicatorScore);
  const passed = score === 1;

  return {
    score: clampScore(score),
    findings: [
      makeFinding({
        evalCase: context.evalCase,
        id: "evidence",
        passed,
        reason: passed ? "Required evidence and indicators were present." : "One or more required evidence signals were missing.",
        diff: {
          expectedEvidence,
          expectedIndicators,
          score
        }
      })
    ]
  };
}
