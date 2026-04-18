import {
  remediationValidationSchema,
  type CreateRemediationValidationInput,
  type RemediationValidation
} from "../schemas/vulnerabilities-v2.schema";
import type { VulnerabilityFinding, VulnerabilityPriority } from "../schemas/vulnerabilities.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

function validationStatus(input: CreateRemediationValidationInput): RemediationValidation["status"] {
  if (input.observedScannerStatus === "fixed") {
    return "validated";
  }
  if (input.observedScannerStatus === "partially_fixed") {
    return "partial";
  }
  if (input.observedScannerStatus === "accepted_risk") {
    return "accepted_risk";
  }
  return "not_fixed";
}

function residualRisk(finding: VulnerabilityFinding, status: RemediationValidation["status"]): VulnerabilityPriority {
  if (status === "validated") {
    return "low";
  }
  if (status === "partial") {
    return finding.priority === "critical" ? "high" : finding.priority;
  }
  if (status === "accepted_risk") {
    return "medium";
  }
  return finding.priority;
}

export function buildRemediationValidation(
  finding: VulnerabilityFinding,
  input: CreateRemediationValidationInput
): RemediationValidation {
  const status = validationStatus(input);
  return remediationValidationSchema.parse({
    id: createId("remediation_validation"),
    findingId: finding.id,
    evidenceSource: input.evidenceSource,
    status,
    timestamp: nowIso(),
    residualRisk: residualRisk(finding, status),
    evidenceRefs: input.evidenceRefs,
    notes: input.notes
  });
}
