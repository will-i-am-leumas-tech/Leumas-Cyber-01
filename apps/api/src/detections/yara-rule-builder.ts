import type { DetectionIntent, DetectionRule } from "../schemas/detections.schema";

function yaraIdentifier(value: string): string {
  const safe = value.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return safe || "Defensive_Detection";
}

function yaraString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildYaraRule(intent: DetectionIntent, sourceRule: DetectionRule): string {
  const values = Object.values(sourceRule.logic.detection.selection)
    .flat()
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
  const uniqueValues = [...new Set(values.length > 0 ? values : [intent.behavior])];
  const strings = uniqueValues.map((value, index) => `    $s${index + 1} = "${yaraString(value)}" nocase`).join("\n");

  return [
    `rule ${yaraIdentifier(sourceRule.title)}`,
    "{",
    "  meta:",
    `    description = "${yaraString(sourceRule.logic.description)}"`,
    `    severity = "${sourceRule.logic.level}"`,
    `    source_rule = "${sourceRule.id}"`,
    "    purpose = \"defensive detection\"",
    "  strings:",
    strings,
    "  condition:",
    "    any of them",
    "}"
  ].join("\n");
}
