import { makeEntity } from "../../ingest/entity-utils";
import type { Entity, IngestSourceRef } from "../../schemas/ingest.schema";

export function normalizeTimestamp(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export function field(line: string, names: string[]): string | undefined {
  for (const name of names) {
    const match = line.match(new RegExp(`\\b${name}=([^\\s"]+|"[^"]+")`, "i"));
    if (match) {
      return match[1].replace(/^"|"$/g, "");
    }
  }
  return undefined;
}

export function sourceRef(input: { artifactId: string; parserId: string; lineNumber?: number; jsonPointer?: string; excerpt?: string }): IngestSourceRef {
  return {
    artifactId: input.artifactId,
    parserId: input.parserId,
    lineNumber: input.lineNumber,
    jsonPointer: input.jsonPointer,
    excerpt: input.excerpt
  };
}

export function addEntity(entities: Entity[], type: Entity["type"], value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const entity = makeEntity(type, value);
  entities.push(entity);
  return entity.id;
}

export function urlHostname(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
}
