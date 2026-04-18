import type { CloudEvent, CloudProvider, IdentityPrincipal } from "../schemas/cloud-security.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function nestedString(value: Record<string, unknown>, path: string[], fallback = "unknown"): string {
  let current: unknown = value;
  for (const segment of path) {
    const record = asRecord(current);
    current = record[segment];
  }
  return asString(current, fallback);
}

function inferProvider(event: Record<string, unknown>, requested?: CloudProvider): CloudProvider {
  if (requested) {
    return requested;
  }
  const source = asString(event.eventSource ?? event.service ?? event.provider, "").toLowerCase();
  if (source.includes("amazonaws") || source.includes("aws")) {
    return "aws";
  }
  if (source.includes("azure") || source.includes("microsoft")) {
    return "azure";
  }
  if (source.includes("okta")) {
    return "okta";
  }
  return "generic";
}

function actionResult(event: Record<string, unknown>): CloudEvent["result"] {
  const outcome = asString(event.errorCode ?? event.outcome ?? nestedString(event, ["outcome", "result"], ""), "").toLowerCase();
  if (!outcome) {
    return "success";
  }
  if (outcome.includes("success")) {
    return "success";
  }
  if (outcome.includes("fail") || outcome.includes("error") || outcome.includes("denied")) {
    return "failure";
  }
  return "unknown";
}

function resourceFromEvent(event: Record<string, unknown>): string {
  const request = asRecord(event.requestParameters);
  const response = asRecord(event.responseElements);
  return asString(
    request.bucketName ??
      request.roleName ??
      request.userName ??
      request.groupName ??
      request.policyArn ??
      response.resource ??
      event.resource ??
      event.target,
    "unknown-resource"
  );
}

function riskSignalsForEvent(event: Record<string, unknown>): string[] {
  const action = asString(event.eventName ?? event.action, "").toLowerCase();
  const serialized = JSON.stringify(event).toLowerCase();
  const signals: string[] = [];
  if (/(attach.*policy|put.*policy|add.*role|assign.*role|createaccesskey|updateassumerolepolicy)/i.test(action)) {
    signals.push("privileged_admin_change");
  }
  if (serialized.includes("administratoraccess") || serialized.includes("owner") || serialized.includes("global administrator")) {
    signals.push("high_privilege_assignment");
  }
  if (serialized.includes('"principal":"*"') || serialized.includes("publicread") || serialized.includes("allusers")) {
    signals.push("public_exposure");
  }
  return [...new Set(signals)];
}

export function normalizeCloudEvent(raw: unknown, index: number, options: { provider?: CloudProvider; caseId?: string } = {}): CloudEvent {
  const event = asRecord(raw);
  const provider = inferProvider(event, options.provider);
  const service = asString(event.eventSource ?? event.service, provider);
  const action = asString(event.eventName ?? event.action, "unknown_action");
  const timestamp = asString(event.eventTime ?? event.timestamp ?? event.time, nowIso());
  const userIdentity = asRecord(event.userIdentity);
  const actor = asString(userIdentity.arn ?? userIdentity.userName ?? event.actor ?? event.user, "unknown-actor");

  return {
    id: createId("cloud_event"),
    caseId: options.caseId,
    provider,
    service,
    action,
    actor,
    resource: resourceFromEvent(event),
    result: actionResult(event),
    sourceIp: asString(event.sourceIPAddress ?? event.sourceIp ?? event.ipAddress, ""),
    timestamp,
    rawRef: `cloud-import:${index + 1}`,
    riskSignals: riskSignalsForEvent(event)
  };
}

export function normalizeIdentityEvent(raw: unknown, index: number, options: { provider?: CloudProvider; caseId?: string } = {}): {
  event: CloudEvent;
  principal: IdentityPrincipal;
} {
  const item = asRecord(raw);
  const actor = asRecord(item.actor);
  const client = asRecord(item.client);
  const provider = options.provider ?? (item.riskLevelAggregated ? "entra" : "okta");
  const principalId = asString(item.userId ?? actor.id ?? item.principalId ?? item.userPrincipalName, "unknown-principal");
  const displayName = asString(item.userPrincipalName ?? actor.alternateId ?? actor.displayName ?? item.displayName, principalId);
  const action = asString(item.eventType ?? item.action ?? "signin");
  const timestamp = asString(item.createdDateTime ?? item.published ?? item.timestamp, nowIso());
  const resultText = asString(item.conditionalAccessStatus ?? nestedString(item, ["outcome", "result"], ""), "").toLowerCase();
  const result: CloudEvent["result"] = resultText.includes("fail") ? "failure" : "success";
  const riskLevel = asString(item.riskLevelAggregated ?? item.riskLevel ?? "", "").toLowerCase();
  const riskSignals = [
    ...(riskLevel === "high" || riskLevel === "medium" ? [`risky_signin_${riskLevel}`] : []),
    ...(action.toLowerCase().includes("mfa") && action.toLowerCase().includes("deactivate") ? ["mfa_disabled"] : []),
    ...(action.toLowerCase().includes("role") || JSON.stringify(item).toLowerCase().includes("global administrator")
      ? ["privileged_admin_change"]
      : [])
  ];

  return {
    event: {
      id: createId("identity_event"),
      caseId: options.caseId,
      provider,
      service: provider === "entra" ? "identity.signin" : "identity.audit",
      action,
      actor: displayName,
      resource: asString(item.resourceDisplayName ?? item.target ?? nestedString(item, ["target", "displayName"], ""), "identity"),
      result,
      sourceIp: asString(item.ipAddress ?? client.ipAddress, ""),
      timestamp,
      rawRef: `identity-import:${index + 1}`,
      riskSignals: [...new Set(riskSignals)]
    },
    principal: {
      id: createId("identity_principal"),
      provider,
      principalId,
      displayName,
      type: "user",
      mfaEnabled: riskSignals.includes("mfa_disabled") ? false : undefined,
      privilegedRoles: riskSignals.includes("privileged_admin_change") ? ["administrator"] : [],
      lastSeenAt: timestamp
    }
  };
}
