import type {
  AssetRiskProfile,
  CreateVulnerabilityRemediationTaskInput,
  VulnerabilityFinding,
  VulnerabilityRemediationTask
} from "../schemas/vulnerabilities.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

const slaDaysByPriority: Record<VulnerabilityFinding["priority"], number> = {
  critical: 7,
  high: 14,
  medium: 30,
  low: 60
};

function dueDateFromPriority(priority: VulnerabilityFinding["priority"]): string {
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + slaDaysByPriority[priority]);
  return due.toISOString();
}

export function buildRemediationTask(
  finding: VulnerabilityFinding,
  asset: AssetRiskProfile | undefined,
  input: CreateVulnerabilityRemediationTaskInput = {}
): VulnerabilityRemediationTask {
  return {
    id: createId("vuln_task"),
    findingId: finding.id,
    action:
      input.action ??
      `Apply the vendor patch or documented mitigation for ${finding.cve} on ${finding.assetName}, then rescan the asset.`,
    owner: input.owner ?? asset?.owner ?? "asset-owner",
    dueDate: input.dueDate ?? dueDateFromPriority(finding.priority),
    validationMethod: "Confirm the scanner no longer reports this finding and document any compensating control evidence.",
    status: "open",
    createdAt: nowIso()
  };
}
