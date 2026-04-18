import type { CloudEvent, PostureFinding } from "../schemas/cloud-security.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function buildPostureFindings(events: CloudEvent[]): PostureFinding[] {
  return events.flatMap((event) => {
    const findings: PostureFinding[] = [];

    if (event.riskSignals.includes("public_exposure")) {
      findings.push({
        id: createId("posture_finding"),
        caseId: event.caseId,
        control: "Public Storage Exposure",
        status: "fail",
        severity: "high",
        evidenceRefs: [event.id],
        remediation: "Review the storage policy, remove public access where not explicitly approved, and document business exceptions.",
        createdAt: nowIso()
      });
    }

    if (event.riskSignals.includes("mfa_disabled")) {
      findings.push({
        id: createId("posture_finding"),
        caseId: event.caseId,
        control: "MFA Enforcement",
        status: "fail",
        severity: "high",
        evidenceRefs: [event.id],
        remediation: "Confirm the change was approved, re-enable MFA for the principal, and review conditional access coverage.",
        createdAt: nowIso()
      });
    }

    if (event.riskSignals.includes("privileged_admin_change")) {
      findings.push({
        id: createId("posture_finding"),
        caseId: event.caseId,
        control: "Privileged Role Change Review",
        status: "warn",
        severity: event.riskSignals.includes("high_privilege_assignment") ? "critical" : "high",
        evidenceRefs: [event.id],
        remediation: "Validate approval, owner, and time-bound need for the privileged change; remove excessive rights if not required.",
        createdAt: nowIso()
      });
    }

    if (event.riskSignals.includes("risky_signin_high")) {
      findings.push({
        id: createId("posture_finding"),
        caseId: event.caseId,
        control: "Risky Authentication Review",
        status: "warn",
        severity: "high",
        evidenceRefs: [event.id],
        remediation: "Review sign-in risk, user confirmation, device posture, and conditional access outcome.",
        createdAt: nowIso()
      });
    }

    return findings;
  });
}
