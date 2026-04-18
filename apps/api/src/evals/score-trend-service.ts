import type { EvalRun } from "./eval-case.schema";

export interface ScoreTrend {
  previousAverageScore?: number;
  delta: number;
  regression: boolean;
}

export function buildScoreTrend(current: EvalRun, previous?: EvalRun, regressionThreshold = 0.03): ScoreTrend {
  if (!previous) {
    return {
      delta: 0,
      regression: false
    };
  }

  const delta = Math.round((current.summary.averageScore - previous.summary.averageScore) * 1000) / 1000;
  return {
    previousAverageScore: previous.summary.averageScore,
    delta,
    regression: delta < -regressionThreshold
  };
}

export function domainScores(run: EvalRun): Record<string, number> {
  const domains = [...new Set(run.results.map((result) => result.domain))];
  return Object.fromEntries(
    domains.map((domain) => {
      const results = run.results.filter((result) => result.domain === domain);
      const average = results.length === 0 ? 0 : results.reduce((sum, result) => sum + result.score.totalScore, 0) / results.length;
      return [domain, Math.round(average * 1000) / 1000];
    })
  );
}
