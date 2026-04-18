import type { SampleAnalysisSummary } from "../schemas/endpoint.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

const unsafeSummaryPatterns = /\b(improve|modify|evade|bypass|persist|steal|exfiltrate|payload|shellcode|reverse shell)\b/i;

export function buildSampleAnalysisSummary(caseId: string, input: {
  hashes?: string[];
  observedBehavior: string[];
  detections?: string[];
}): SampleAnalysisSummary {
  const observedBehavior = input.observedBehavior.map((item) =>
    unsafeSummaryPatterns.test(item) ? "Unsafe procedural detail removed; behavior retained for defensive triage." : item
  );

  return {
    id: createId("sample_summary"),
    caseId,
    hashes: input.hashes ?? [],
    observedBehavior,
    detections: input.detections ?? [],
    safeRemediationGuidance: [
      "Preserve the sample hash and source metadata.",
      "Review endpoint detections and affected hosts.",
      "Apply containment or remediation only through approved defensive action workflows."
    ],
    createdAt: nowIso()
  };
}
