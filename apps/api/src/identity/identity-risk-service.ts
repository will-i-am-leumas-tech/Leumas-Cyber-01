import type { CloudEvent, IdentityPrincipal, PermissionRisk } from "../schemas/cloud-security.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function mergeIdentityPrincipals(principals: IdentityPrincipal[]): IdentityPrincipal[] {
  const byKey = new Map<string, IdentityPrincipal>();
  for (const principal of principals) {
    const key = `${principal.provider}:${principal.principalId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, principal);
      continue;
    }

    byKey.set(key, {
      ...existing,
      displayName: principal.displayName || existing.displayName,
      mfaEnabled: principal.mfaEnabled ?? existing.mfaEnabled,
      privilegedRoles: [...new Set([...existing.privilegedRoles, ...principal.privilegedRoles])],
      lastSeenAt: [existing.lastSeenAt, principal.lastSeenAt].filter(Boolean).sort().at(-1)
    });
  }

  return [...byKey.values()];
}

export function buildPermissionRisks(events: CloudEvent[], principals: IdentityPrincipal[]): PermissionRisk[] {
  return events.flatMap((event) => {
    const principal = principals.find(
      (candidate) => candidate.displayName === event.actor || candidate.principalId === event.actor || event.actor.includes(candidate.principalId)
    );
    const principalId = principal?.principalId ?? event.actor;
    const risks: PermissionRisk[] = [];

    if (event.riskSignals.includes("privileged_admin_change") || event.riskSignals.includes("high_privilege_assignment")) {
      risks.push({
        id: createId("permission_risk"),
        caseId: event.caseId,
        principalId,
        resource: event.resource,
        riskyPermission: event.riskSignals.includes("high_privilege_assignment")
          ? "high_privilege_assignment"
          : "privileged_admin_change",
        exposure: event.provider === "aws" || event.provider === "azure" ? "cloud_control_plane" : "identity_control_plane",
        severity: event.riskSignals.includes("high_privilege_assignment") ? "critical" : "high",
        recommendation: "Use least privilege, require documented approval, and time-bound privileged access where supported.",
        evidenceRefs: [event.id],
        createdAt: nowIso()
      });
    }

    if (event.riskSignals.includes("mfa_disabled")) {
      risks.push({
        id: createId("permission_risk"),
        caseId: event.caseId,
        principalId,
        resource: event.resource,
        riskyPermission: "mfa_disabled",
        exposure: "identity_authentication",
        severity: "high",
        recommendation: "Re-enable MFA and review conditional access policy coverage for the principal.",
        evidenceRefs: [event.id],
        createdAt: nowIso()
      });
    }

    return risks;
  });
}
