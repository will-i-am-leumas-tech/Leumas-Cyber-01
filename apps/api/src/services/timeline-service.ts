import type { TimelineEvent } from "../schemas/result.schema";

const timestampPatterns = [
  /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/,
  /\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}\b/,
  /\b\d{4}\/\d{2}\/\d{2}[ T]\d{2}:\d{2}:\d{2}\b/
];
const jsonTimestampFieldPattern = /^"?(?:timestamp|@timestamp|time|event\.created)"?\s*:\s*"/i;

function normalizeTimestamp(value: string): string {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString();
}

function labelFromLine(line: string, timestamp: string): string {
  const trimmed = line.replace(timestamp, "").trim();
  if (!trimmed) {
    return "Observed event";
  }
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

export function buildTimeline(input: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (jsonTimestampFieldPattern.test(trimmed)) {
      continue;
    }

    const timestampMatch = timestampPatterns.map((pattern) => trimmed.match(pattern)).find(Boolean);
    if (!timestampMatch) {
      continue;
    }

    const timestamp = timestampMatch[0];
    events.push({
      timestamp: normalizeTimestamp(timestamp),
      label: labelFromLine(trimmed, timestamp),
      raw: trimmed
    });
  }

  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
