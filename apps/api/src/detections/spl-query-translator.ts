import type { DetectionRule } from "../schemas/detections.schema";

const fieldMap: Record<string, string> = {
  "process.image": "process_name",
  "process.commandLine": "process_command_line",
  "process.parentImage": "parent_process_name",
  eventType: "event_type",
  srcIp: "src_ip",
  user: "user",
  host: "host"
};

function splPattern(value: string): string {
  return `"*${value.replace(/"/g, '\\"')}*"`;
}

export function translateRuleToSpl(rule: DetectionRule): string {
  const clauses = Object.entries(rule.logic.detection.selection).map(([field, values]) => {
    const mappedField = fieldMap[field] ?? field.replace(/[^A-Za-z0-9_]/g, "_");
    return `(${values.map((value) => `${mappedField}=${splPattern(value)}`).join(" OR ")})`;
  });

  return [
    "index=security",
    clauses.length > 0 ? clauses.join(" ") : "search false",
    "| table _time host user process_name process_command_line src_ip event_type"
  ].join(" ");
}
