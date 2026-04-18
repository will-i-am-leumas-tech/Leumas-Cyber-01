import type { AgentResult } from "../schemas/agents.schema";
import type { ReviewerFinding } from "../schemas/agents-v2.schema";
import type { CyberCase } from "../schemas/case.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function runReviewerAgent(input: {
  cyberCase: CyberCase;
  runId: string;
  results: AgentResult[];
}): ReviewerFinding {
  const groundingFailures =
    input.cyberCase.result?.reasoning?.findings
      .filter((finding) => finding.evidenceObservationIds.length === 0)
      .map((finding) => finding.id) ?? [];
  const safetyFailures = input.results
    .filter((result) => result.role === "safetyReviewer" && result.output.allowed === false)
    .map((result) => result.id);
  const completenessWarnings = input.results
    .filter((result) => result.validationStatus === "failed")
    .map((result) => `${result.role}:${result.id}`);
  const status = safetyFailures.length > 0 ? "blocked" : groundingFailures.length > 0 || completenessWarnings.length > 0 ? "needs_review" : "passed";

  return {
    id: createId("reviewer_finding"),
    runId: input.runId,
    status,
    groundingFailures,
    safetyFailures,
    completenessWarnings,
    createdAt: nowIso()
  };
}
