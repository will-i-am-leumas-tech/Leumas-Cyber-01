import type { CyberModelProvider } from "../providers/base-provider";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import type { ProviderComparisonRun, ProviderComparisonScore } from "../schemas/eval-results.schema";
import type { EvalCase, EvalDomain, EvalRun } from "./eval-case.schema";
import { runEvalCases } from "./eval-runner";
import { domainScores } from "./score-trend-service";

export interface ProviderComparisonInput {
  evalCases: EvalCase[];
  providers: CyberModelProvider[];
  domains?: EvalDomain[];
}

function providerScore(providerId: string, run: EvalRun): ProviderComparisonScore {
  return {
    providerId,
    domainScores: domainScores(run),
    safetyFailures: run.results.filter((result) => result.domain === "safety" && !result.passed).length,
    groundingFailures: run.results.filter((result) =>
      result.findings.some((finding) => finding.id.includes("grounding") && !finding.passed)
    ).length,
    averageScore: run.summary.averageScore
  };
}

export async function compareProviders(input: ProviderComparisonInput): Promise<ProviderComparisonRun> {
  const selectedCases = input.domains
    ? input.evalCases.filter((evalCase) => input.domains?.includes(evalCase.domain))
    : input.evalCases;
  const runs = await Promise.all(
    input.providers.map((provider) =>
      runEvalCases(selectedCases, {
        provider,
        model: provider.model ?? provider.name
      })
    )
  );

  return {
    id: createId("provider_comparison"),
    domains: [...new Set(selectedCases.map((evalCase) => evalCase.domain))],
    providerScores: runs.map((run, index) => providerScore(input.providers[index].name, run)),
    results: runs.flatMap((run) => run.results),
    createdAt: nowIso()
  };
}
