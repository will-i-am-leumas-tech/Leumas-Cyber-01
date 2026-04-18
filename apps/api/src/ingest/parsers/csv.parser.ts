import type { ArtifactWithContent } from "../artifact-service";
import { makeEntity } from "../entity-utils";
import type { ParserAdapter, ParseResult } from "../parser-registry";
import type { Entity, NormalizedEvent } from "../../schemas/ingest.schema";

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeTimestamp(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function pick(row: Record<string, string>, names: string[]): string | undefined {
  const lower = new Map(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]));
  for (const name of names) {
    const found = lower.get(name.toLowerCase());
    if (found) {
      return found;
    }
  }
  return undefined;
}

function addEntity(entities: Entity[], type: Entity["type"], value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const entity = makeEntity(type, value);
  entities.push(entity);
  return entity.id;
}

export const csvParser: ParserAdapter = {
  id: "csv",

  canParse(input: ArtifactWithContent): number {
    const firstLine = input.text.split(/\r?\n/)[0] ?? "";
    if (input.artifact.mediaType === "text/csv" || input.artifact.filename.toLowerCase().endsWith(".csv")) {
      return 0.9;
    }
    return firstLine.includes(",") && /time|timestamp|user|host|src|event/i.test(firstLine) ? 0.6 : 0;
  },

  parse(input: ArtifactWithContent): ParseResult {
    const lines = input.text.split(/\r?\n/).filter((line) => line.trim());
    const headers = parseCsvLine(lines[0] ?? "");
    const entities: Entity[] = [];
    const events: NormalizedEvent[] = [];

    for (const [index, line] of lines.slice(1).entries()) {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
      const timestamp = normalizeTimestamp(pick(row, ["timestamp", "time", "@timestamp"]));
      const actor = pick(row, ["user", "username", "actor"]);
      const asset = pick(row, ["host", "hostname", "computer", "asset"]);
      const srcIp = pick(row, ["src", "src_ip", "srcIp", "source.ip"]);
      const dstIp = pick(row, ["dst", "dst_ip", "dstIp", "destination.ip"]);
      const eventType = pick(row, ["eventType", "event_type", "event", "action"]) ?? "csv_event";
      const entityIds = [
        addEntity(entities, "user", actor),
        addEntity(entities, "host", asset),
        addEntity(entities, "ip", srcIp),
        addEntity(entities, "ip", dstIp)
      ].filter((value): value is string => Boolean(value));

      events.push({
        id: `event_${input.artifact.hash.slice(0, 12)}_${String(index + 1).padStart(3, "0")}`,
        timestamp,
        source: input.artifact.filename,
        eventType,
        severity: eventType.toLowerCase().includes("fail") ? "medium" : "low",
        actor,
        asset,
        network: { srcIp, dstIp },
        process: {},
        entityIds,
        rawRef: {
          artifactId: input.artifact.id,
          parserId: csvParser.id,
          lineNumber: index + 2,
          excerpt: line
        }
      });
    }

    return {
      events,
      entities,
      warnings: []
    };
  }
};
