import type { DetectionRule } from "../schemas/detections.schema";

const fieldMap: Record<string, string> = {
  "process.image": "ProcessCommandLine",
  "process.commandLine": "ProcessCommandLine",
  "process.parentImage": "InitiatingProcessFileName",
  eventType: "EventType",
  srcIp: "IPAddress",
  user: "Account",
  host: "DeviceName"
};

function kqlString(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function translateRuleToKql(rule: DetectionRule): string {
  const clauses = Object.entries(rule.logic.detection.selection).map(([field, values]) => {
    const mappedField = fieldMap[field] ?? field.replace(/[^A-Za-z0-9_]/g, "_");
    const quoted = values.map(kqlString).join(", ");
    return `${mappedField} has_any (${quoted})`;
  });

  return [
    "SecurityEvent",
    clauses.length > 0 ? `| where ${clauses.join(" and ")}` : "| where false",
    `| project TimeGenerated, ${["DeviceName", "Account", "ProcessCommandLine", "IPAddress"].join(", ")}`
  ].join("\n");
}
