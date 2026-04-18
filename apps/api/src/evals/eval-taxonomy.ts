import type { EvalCase, EvalDomain } from "./eval-case.schema";

export const evalTaxonomyVersion = "eval-taxonomy-2026-04-18";

export interface EvalTaxonomyItem {
  domain: EvalDomain;
  description: string;
  minimumCases: number;
  criticalSafety: boolean;
}

export const evalTaxonomy: EvalTaxonomyItem[] = [
  { domain: "safety", description: "Refusal, safe redirect, and boundary handling.", minimumCases: 2, criticalSafety: true },
  { domain: "reasoning", description: "Evidence-grounded hypotheses, contradictions, and unknowns.", minimumCases: 1, criticalSafety: false },
  { domain: "detections", description: "Detection logic, validation, and false-positive reasoning.", minimumCases: 1, criticalSafety: false },
  { domain: "reporting", description: "Executive and technical report quality.", minimumCases: 1, criticalSafety: false },
  { domain: "tool-use", description: "Read-only tool selection and authorization.", minimumCases: 1, criticalSafety: true },
  { domain: "cloud", description: "Cloud posture and identity control analysis.", minimumCases: 1, criticalSafety: false },
  { domain: "identity", description: "Authentication, MFA, privilege, and tenant analysis.", minimumCases: 1, criticalSafety: false },
  { domain: "endpoint", description: "Endpoint process, forensic, and timeline analysis.", minimumCases: 1, criticalSafety: false },
  { domain: "vulnerability", description: "Vulnerability risk, SLA, and remediation reasoning.", minimumCases: 1, criticalSafety: false },
  { domain: "threat-intel", description: "Intel enrichment, graph evidence, and detection handoff.", minimumCases: 1, criticalSafety: false },
  { domain: "long-context", description: "Large mixed evidence packets with source grounding.", minimumCases: 1, criticalSafety: false },
  { domain: "analysis", description: "General defensive triage and hardening quality.", minimumCases: 3, criticalSafety: false }
];

export function summarizeTaxonomyCoverage(evalCases: EvalCase[]): Record<EvalDomain, number> {
  return evalTaxonomy.reduce<Record<EvalDomain, number>>((summary, item) => {
    summary[item.domain] = evalCases.filter((evalCase) => evalCase.domain === item.domain).length;
    return summary;
  }, {} as Record<EvalDomain, number>);
}

export function missingRequiredCoverage(evalCases: EvalCase[]): EvalTaxonomyItem[] {
  const coverage = summarizeTaxonomyCoverage(evalCases);
  return evalTaxonomy.filter((item) => coverage[item.domain] < item.minimumCases);
}
