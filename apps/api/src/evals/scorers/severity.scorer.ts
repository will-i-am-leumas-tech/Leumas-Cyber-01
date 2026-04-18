import type { ScorePart, EvalScoringContext } from "./scoring-utils";
import { makeFinding } from "./scoring-utils";

export function scoreSeverity(context: EvalScoringContext): ScorePart {
  const expected = context.evalCase.expectedSignals.severity;
  const actual = context.response.result?.severity;
  if (!expected || context.evalCase.blockedExpected) {
    return {
      score: 1,
      findings: [
        makeFinding({
          evalCase: context.evalCase,
          id: "severity",
          passed: true,
          reason: "No severity assertion is required for this eval case."
        })
      ]
    };
  }

  const passed = actual === expected;
  return {
    score: passed ? 1 : 0,
    findings: [
      makeFinding({
        evalCase: context.evalCase,
        id: "severity",
        passed,
        reason: passed ? `Severity matched ${expected}.` : `Expected severity ${expected}, received ${actual ?? "none"}.`,
        diff: { expected, actual }
      })
    ]
  };
}

export function scoreCategory(context: EvalScoringContext): ScorePart {
  const expected = context.evalCase.expectedSignals.category;
  const actual = context.response.result?.category;
  if (!expected || context.evalCase.blockedExpected) {
    return {
      score: 1,
      findings: [
        makeFinding({
          evalCase: context.evalCase,
          id: "category",
          passed: true,
          reason: "No category assertion is required for this eval case."
        })
      ]
    };
  }

  const passed = actual === expected;
  return {
    score: passed ? 1 : 0,
    findings: [
      makeFinding({
        evalCase: context.evalCase,
        id: "category",
        passed,
        reason: passed ? `Category matched ${expected}.` : `Expected category ${expected}, received ${actual ?? "none"}.`,
        diff: { expected, actual }
      })
    ]
  };
}
