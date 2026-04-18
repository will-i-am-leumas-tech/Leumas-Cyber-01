import type { ArtifactWithContent } from "../artifact-service";
import { makeEntity } from "../entity-utils";
import type { ParserAdapter, ParseResult } from "../parser-registry";
import type { Entity, IngestSourceRef, NormalizedEvent, ParserWarning } from "../../schemas/ingest.schema";

const timestampPattern = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b|\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}\b/;

function normalizeTimestamp(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function field(line: string, names: string[]): string | undefined {
  for (const name of names) {
    const match = line.match(new RegExp(`\\b${name}=([^\\s"]+|"[^"]+")`, "i"));
    if (match) {
      return match[1].replace(/^"|"$/g, "");
    }
  }
  return undefined;
}

function eventType(line: string): string {
  if (/\bfailed login|authentication failed|event id[:= ]?4625|status=failure\b/i.test(line)) {
    return "auth_failure";
  }
  if (/\bsuccessful login|accepted password|event id[:= ]?4624|status=success\b/i.test(line)) {
    return "auth_success";
  }
  if (/\bevent[_ ]?id=4688|event id[:= ]?4688|process|command_line|image=/i.test(line)) {
    return "process_creation";
  }
  return "log_event";
}

function severityForLine(line: string): "low" | "medium" | "high" | "critical" {
  if (/\bencodedcommand|-enc\b/i.test(line)) {
    return "high";
  }
  if (/\bfailed login|authentication failed|status=failure\b/i.test(line)) {
    return "medium";
  }
  return "low";
}

function sourceRef(artifactId: string, lineNumber: number, excerpt: string): IngestSourceRef {
  return {
    artifactId,
    parserId: lineLogParser.id,
    lineNumber,
    excerpt
  };
}

function addEntity(entities: Entity[], type: Entity["type"], value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const entity = makeEntity(type, value);
  entities.push(entity);
  return entity.id;
}

export const lineLogParser: ParserAdapter = {
  id: "line-log",

  canParse(input: ArtifactWithContent): number {
    if (input.artifact.mediaType === "text/csv") {
      return 0.1;
    }
    return input.text.split(/\r?\n/).some((line) => timestampPattern.test(line) || /\buser=|host=|src=|event_id=/i.test(line))
      ? 0.7
      : 0.3;
  },

  parse(input: ArtifactWithContent): ParseResult {
    const events: NormalizedEvent[] = [];
    const entities: Entity[] = [];
    const warnings: ParserWarning[] = [];

    for (const [index, rawLine] of input.text.split(/\r?\n/).entries()) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const timestamp = normalizeTimestamp(line.match(timestampPattern)?.[0]);
      const hasStructuredFields = /\buser=|host=|hostname=|src=|dst=|event_id=|image=|process=|command=/i.test(line);
      if (!timestamp && !hasStructuredFields) {
        warnings.push({
          parserId: lineLogParser.id,
          sourceRef: sourceRef(input.artifact.id, index + 1, line),
          message: "Line did not look like a structured log event.",
          severity: "info"
        });
        continue;
      }
      const actor = field(line, ["user", "username", "actor"]);
      const asset = field(line, ["host", "hostname", "computer", "device"]);
      const srcIp = field(line, ["src", "src_ip", "srcIp", "source"]);
      const dstIp = field(line, ["dst", "dst_ip", "dstIp", "destination"]);
      const image = field(line, ["image", "process"]);
      const parentImage = field(line, ["parent", "parent_process"]);
      const commandLine = field(line, ["command_line", "command"]);
      const entityIds = [
        addEntity(entities, "user", actor),
        addEntity(entities, "host", asset),
        addEntity(entities, "ip", srcIp),
        addEntity(entities, "ip", dstIp),
        addEntity(entities, "process", image),
        addEntity(entities, "process", parentImage)
      ].filter((value): value is string => Boolean(value));

      if (!timestamp) {
        warnings.push({
          parserId: lineLogParser.id,
          sourceRef: sourceRef(input.artifact.id, index + 1, line),
          message: "Line did not include a supported timestamp.",
          severity: "info"
        });
      }

      events.push({
        id: `event_${input.artifact.hash.slice(0, 12)}_${String(events.length + 1).padStart(3, "0")}`,
        timestamp,
        source: input.artifact.filename,
        eventType: eventType(line),
        severity: severityForLine(line),
        actor,
        asset,
        network: {
          srcIp,
          dstIp
        },
        process: {
          image,
          parentImage,
          commandLine
        },
        entityIds,
        rawRef: sourceRef(input.artifact.id, index + 1, line)
      });
    }

    return {
      events,
      entities,
      warnings
    };
  }
};
