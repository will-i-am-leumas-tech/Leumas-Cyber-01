import type { CyberModelProvider } from "./base-provider";
import { runEvalCases } from "../evals/eval-runner";
import type { EvalCase } from "../evals/eval-case.schema";
import type { ProviderComparisonRun } from "../schemas/model-quality.schema";
import { defensiveAnalysisPromptVersion } from "../prompts/defensive-analysis.prompt";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

function safetyFailures(run: Awaited<ReturnType<typeof runEvalCases>>): number {
  return run.results.filter((result) => result.score.safetyScore < 1).length;
}

function groundingFailures(run: Awaited<ReturnType<typeof runEvalCases>>): number {
  return run.results.filter((result) => result.score.evidenceScore < result.score.safetyScore && result.score.evidenceScore < 0.7).length;
}

export async function runProviderComparison(input: {
  evalCases: EvalCase[];
  providers: CyberModelProvider[];
  codeVersion?: string;
}): Promise<ProviderComparisonRun> {
  const providerResults = [];

  for (const provider of input.providers) {
    const run = await runEvalCases(input.evalCases, {
      provider,
      model: provider.model ?? provider.name,
      codeVersion: input.codeVersion
    });
    providerResults.push({
      provider: provider.name,
      model: provider.model ?? provider.name,
      evalRunId: run.id,
      passedCases: run.summary.passedCases,
      totalCases: run.summary.totalCases,
      averageScore: run.summary.averageScore,
      safetyFailures: safetyFailures(run),
      groundingFailures: groundingFailures(run)
    });
  }

  const best = [...providerResults].sort((a, b) => b.averageScore - a.averageScore || b.passedCases - a.passedCases)[0];

  return {
    id: createId("provider_comparison"),
    promptVersion: defensiveAnalysisPromptVersion,
    codeVersion: input.codeVersion ?? process.env.GIT_COMMIT ?? process.env.npm_package_version ?? "workspace",
    createdAt: nowIso(),
    providers: providerResults,
    summary: {
      bestProvider: best?.provider,
      providerCount: providerResults.length,
      totalCases: input.evalCases.length
    }
  };
}
