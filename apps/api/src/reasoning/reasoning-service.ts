import type { AnalysisResult } from "../schemas/result.schema";
import type { ReasoningBundle, ReasoningRun } from "../schemas/reasoning.schema";
import { composeFindings } from "./finding-composer";
import { buildHypotheses } from "./hypothesis-service";
import { buildObservations } from "./observation-builder";
import { validateReasoningBundle } from "./reasoning-validator";

type AnalysisForReasoning = Omit<AnalysisResult, "reportMarkdown" | "reasoning">;

export function buildReasoningBundle(result: AnalysisForReasoning, reasoningRuns: ReasoningRun[]): ReasoningBundle {
  const observations = buildObservations(result);
  const hypotheses = buildHypotheses(result, observations);
  const findings = composeFindings(result, observations, hypotheses);
  const assumptions = hypotheses.flatMap((hypothesis) => hypothesis.assumptions);
  const unknowns = hypotheses.flatMap((hypothesis) => hypothesis.unknowns);
  const bundle: ReasoningBundle = {
    observations,
    hypotheses,
    findings,
    reasoningRuns,
    assumptions: [...new Set(assumptions)],
    unknowns: [...new Set(unknowns)]
  };

  const validation = validateReasoningBundle(bundle);
  if (!validation.valid) {
    throw new Error(`Reasoning validation failed: ${validation.issues.join(" ")}`);
  }

  return bundle;
}
