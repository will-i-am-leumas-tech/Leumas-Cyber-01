import type { CyberCase } from "../../schemas/case.schema";

export function runInvestigatorAgent(cyberCase: CyberCase): Record<string, unknown> {
  return {
    findingIds: cyberCase.result?.reasoning?.findings.map((finding) => finding.id) ?? [],
    severity: cyberCase.result?.severity ?? cyberCase.severity,
    category: cyberCase.result?.category ?? "unknown",
    summary: cyberCase.result?.summary ?? cyberCase.summary
  };
}
