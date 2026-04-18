import type { UnknownRecord } from "../schemas/reasoning-v2.schema";

function priorityForUnknown(unknown: string): UnknownRecord["priority"] {
  return /blast radius|affected assets|authorized|related activity/i.test(unknown) ? "high" : "medium";
}

function sourceForUnknown(unknown: string): string {
  if (/blast radius|affected assets|elsewhere/i.test(unknown)) {
    return "SIEM, EDR, identity, cloud, and asset inventory telemetry.";
  }
  if (/authorized|system owner/i.test(unknown)) {
    return "Change management, ticketing, asset owner, and admin activity records.";
  }
  if (/scanner|configuration|control/i.test(unknown)) {
    return "Configuration scanner, CSPM, endpoint posture, or control validation evidence.";
  }
  if (/reputation|sightings/i.test(unknown)) {
    return "Threat intelligence enrichment and internal telemetry sightings.";
  }
  return "Additional source telemetry and analyst validation.";
}

export function buildUnknownRecords(unknowns: string[]): UnknownRecord[] {
  return [...new Set(unknowns)].map((unknown, index) => ({
    id: `unknown_${String(index + 1).padStart(3, "0")}`,
    question: unknown.endsWith("?") ? unknown : `${unknown}?`,
    reason: "Reasoning confidence depends on this unanswered investigation question.",
    priority: priorityForUnknown(unknown),
    suggestedSource: sourceForUnknown(unknown),
    status: "open"
  }));
}
