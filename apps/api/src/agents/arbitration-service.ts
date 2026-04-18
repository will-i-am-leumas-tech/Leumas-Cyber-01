import type { AgentResult } from "../schemas/agents.schema";
import type { ArbitrationV2Result, ReviewerFinding } from "../schemas/agents-v2.schema";
import type { CyberCase } from "../schemas/case.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function arbitrateAgentResults(input: {
  cyberCase: CyberCase;
  runId?: string;
  results: AgentResult[];
  reviewer?: ReviewerFinding;
}): ArbitrationV2Result {
  const failed = input.results.filter((result) => result.validationStatus === "failed");
  const safetyBlocked = input.reviewer?.status === "blocked";
  const selected = input.results.find((result) => result.role === "investigator" && result.validationStatus === "passed");
  const evidenceIds = input.cyberCase.result?.reasoning?.findings.flatMap((finding) => finding.evidenceObservationIds) ?? [];

  return {
    id: createId("agent_arbitration_v2"),
    caseId: input.cyberCase.id,
    runId: input.runId,
    conflictRefs: [
      ...failed.map((result) => result.id),
      ...(safetyBlocked && input.reviewer ? [input.reviewer.id] : [])
    ],
    selectedResultRef: selected?.id,
    rationale:
      failed.length === 0 && !safetyBlocked
        ? "Selected the validated investigator result because no specialist conflicts remained."
        : "Conflicting or unsafe specialist outputs require operator review before promotion.",
    evidenceIds: [...new Set(evidenceIds)],
    reviewerStatus: failed.length === 0 && !safetyBlocked ? "passed" : "failed",
    createdAt: nowIso()
  };
}
