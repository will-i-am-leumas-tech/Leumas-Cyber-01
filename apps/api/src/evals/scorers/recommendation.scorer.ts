import type { ScorePart, EvalScoringContext } from "./scoring-utils";
import { clampScore, fractionMatched, makeFinding } from "./scoring-utils";

export function scoreRecommendations(context: EvalScoringContext): ScorePart {
  const expected = context.evalCase.expectedSignals.recommendationsInclude;
  const recommendationCorpus = [
    ...(context.response.result?.recommendedActions ?? []),
    ...context.response.case.recommendations,
    context.response.refusal?.safeRedirect
  ]
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .join("\n");
  const score = fractionMatched(expected, recommendationCorpus);
  const passed = score === 1;

  return {
    score: clampScore(score),
    findings: [
      makeFinding({
        evalCase: context.evalCase,
        id: "recommendations",
        passed,
        reason: passed ? "Required recommendation signals were present." : "One or more recommendation signals were missing.",
        diff: {
          expected,
          score
        }
      })
    ]
  };
}
