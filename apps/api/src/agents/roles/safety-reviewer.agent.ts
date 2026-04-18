import type { CyberCase } from "../../schemas/case.schema";
import { validateOutputSafety } from "../../safety/output-validator";

export function runSafetyReviewerAgent(cyberCase: CyberCase): Record<string, unknown> {
  const output = [cyberCase.summary, cyberCase.reportMarkdown, cyberCase.result?.notes.join("\n") ?? ""].join("\n\n");
  const safety = validateOutputSafety(output);
  return {
    allowed: safety.allowed,
    blockedSegments: safety.blockedSegments,
    reviewSummary: safety.allowed
      ? "Case summary, notes, and report passed agent safety review."
      : "Agent safety review blocked unsafe final output."
  };
}
