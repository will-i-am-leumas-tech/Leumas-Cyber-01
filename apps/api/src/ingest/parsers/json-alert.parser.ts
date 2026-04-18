import type { ArtifactWithContent } from "../artifact-service";
import { makeEntity } from "../entity-utils";
import type { ParserAdapter, ParseResult } from "../parser-registry";
import type { Entity, IngestSourceRef, NormalizedEvent } from "../../schemas/ingest.schema";

function valueAtPath(value: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const parts = path.split(".");
    let current: unknown = value;
    for (const part of parts) {
      if (typeof current !== "object" || current === null || !(part in current)) {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (current !== undefined) {
      return current;
    }
  }
  return undefined;
}

function stringAtPath(value: unknown, paths: string[]): string | undefined {
  const found = valueAtPath(value, paths);
  return typeof found === "string" || typeof found === "number" ? String(found) : undefined;
}

function normalizeTimestamp(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function eventTypeFromJson(json: unknown): string {
  const eventId = stringAtPath(json, ["eventId", "event_id", "winlog.event_id"]);
  const commandLine = stringAtPath(json, ["commandLine", "process.command_line", "process.commandLine"]);
  const processName = stringAtPath(json, ["process", "process.name", "image"]);

  if (eventId === "4688" || commandLine || processName) {
    return "process_creation";
  }

  if (eventId === "4625") {
    return "auth_failure";
  }

  if (eventId === "4624") {
    return "auth_success";
  }

  return "json_alert";
}

function sourceRef(artifactId: string, jsonPointer: string, excerpt?: string): IngestSourceRef {
  return {
    artifactId,
    parserId: jsonAlertParser.id,
    jsonPointer,
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

export const jsonAlertParser: ParserAdapter = {
  id: "json-alert",

  canParse(input: ArtifactWithContent): number {
    if (input.json !== undefined) {
      return 1;
    }

    if (input.artifact.mediaType === "application/json" || input.artifact.filename.toLowerCase().endsWith(".json")) {
      try {
        JSON.parse(input.text);
        return 0.95;
      } catch {
        return 0.2;
      }
    }

    return 0;
  },

  parse(input: ArtifactWithContent): ParseResult {
    const entities: Entity[] = [];
    const json = input.json ?? JSON.parse(input.text);
    const timestamp = normalizeTimestamp(stringAtPath(json, ["timestamp", "@timestamp", "time", "event.created"]));
    const actor = stringAtPath(json, ["user", "username", "actor.user", "winlog.event_data.SubjectUserName"]);
    const asset = stringAtPath(json, ["host", "hostname", "computer", "device.name", "host.name"]);
    const srcIp = stringAtPath(json, ["srcIp", "source.ip", "src_ip", "client.ip"]);
    const dstIp = stringAtPath(json, ["dstIp", "destination.ip", "dst_ip"]);
    const image = stringAtPath(json, ["process", "process.name", "image"]);
    const parentImage = stringAtPath(json, ["parentProcess", "process.parent.name"]);
    const commandLine = stringAtPath(json, ["commandLine", "process.command_line", "process.commandLine"]);
    const entityIds = [
      addEntity(entities, "user", actor),
      addEntity(entities, "host", asset),
      addEntity(entities, "ip", srcIp),
      addEntity(entities, "ip", dstIp),
      addEntity(entities, "process", image),
      addEntity(entities, "process", parentImage)
    ].filter((value): value is string => Boolean(value));
    const event: NormalizedEvent = {
      id: `event_${input.artifact.hash.slice(0, 12)}_001`,
      timestamp,
      source: input.artifact.filename,
      eventType: eventTypeFromJson(json),
      severity: commandLine?.toLowerCase().includes("encodedcommand") ? "high" : "low",
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
      rawRef: sourceRef(input.artifact.id, "/", input.text.slice(0, 240))
    };

    return {
      events: [event],
      entities,
      warnings: []
    };
  }
};
