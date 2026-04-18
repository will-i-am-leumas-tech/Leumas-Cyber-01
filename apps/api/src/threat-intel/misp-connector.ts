import type { IntelRelationship, IntelSource, StixObjectRecord } from "../schemas/threat-intel-v2.schema";
import { nowIso } from "../utils/time";
import { applyConfidenceDecay, expiresAtForSource } from "./confidence-decay-service";

interface MispAttribute {
  uuid?: string;
  type?: string;
  value?: string;
  category?: string;
  comment?: string;
  Tag?: Array<{ name?: string }>;
}

interface MispObject {
  uuid?: string;
  name?: string;
  Attribute?: MispAttribute[];
}

interface MispEvent {
  uuid?: string;
  info?: string;
  date?: string;
  threat_level_id?: string;
  Attribute?: MispAttribute[];
  Object?: MispObject[];
}

const mispTypeMap: Record<string, string> = {
  domain: "domain",
  hostname: "domain",
  "ip-dst": "ipv4",
  "ip-src": "ipv4",
  url: "url",
  md5: "md5",
  sha1: "sha1",
  sha256: "sha256"
};

function eventFromPayload(event: Record<string, unknown>): MispEvent {
  const wrapped = event.Event as MispEvent | undefined;
  return wrapped ?? (event as MispEvent);
}

function confidenceForEvent(event: MispEvent, source: IntelSource): number {
  const threatLevel = Number(event.threat_level_id ?? 3);
  const base = threatLevel === 1 ? 0.9 : threatLevel === 2 ? 0.75 : 0.55;
  return Math.round(base * source.trustScore * 100) / 100;
}

function tagsForAttribute(attribute: MispAttribute): string[] {
  const tags = attribute.Tag?.map((tag) => tag.name).filter((tag): tag is string => Boolean(tag)) ?? [];
  return [...new Set([attribute.category, ...tags].filter((tag): tag is string => Boolean(tag)))];
}

function recordFromAttribute(attribute: MispAttribute, event: MispEvent, source: IntelSource): StixObjectRecord | null {
  if (!attribute.type || !attribute.value || !mispTypeMap[attribute.type]) {
    return null;
  }

  const createdAt = event.date ? `${event.date}T00:00:00.000Z` : nowIso();
  const stixId = `misp-attribute--${attribute.uuid ?? `${attribute.type}-${attribute.value}`}`;
  const record: StixObjectRecord = {
    id: stixId,
    stixId,
    type: "indicator",
    name: attribute.value,
    indicatorType: mispTypeMap[attribute.type],
    indicatorValue: attribute.value,
    sourceId: source.id,
    confidence: confidenceForEvent(event, source),
    decayedConfidence: confidenceForEvent(event, source),
    labels: tagsForAttribute(attribute),
    firstSeen: createdAt,
    lastSeen: createdAt,
    expiresAt: expiresAtForSource(source, createdAt),
    content: attribute as Record<string, unknown>,
    createdAt: nowIso()
  };
  return applyConfidenceDecay(record, source);
}

export function importMispEvent(eventPayload: Record<string, unknown>, source: IntelSource): {
  objects: StixObjectRecord[];
  relationships: IntelRelationship[];
} {
  const event = eventFromPayload(eventPayload);
  const attributes = event.Attribute ?? [];
  const objects: StixObjectRecord[] = attributes
    .map((attribute) => recordFromAttribute(attribute, event, source))
    .filter((record): record is StixObjectRecord => Boolean(record));
  const relationships: IntelRelationship[] = [];

  for (const object of event.Object ?? []) {
    const objectId = `misp-object--${object.uuid ?? object.name ?? "object"}`;
    objects.push(
      applyConfidenceDecay(
        {
          id: objectId,
          stixId: objectId,
          type: "other",
          name: object.name ?? "MISP object",
          sourceId: source.id,
          confidence: confidenceForEvent(event, source),
          decayedConfidence: confidenceForEvent(event, source),
          labels: ["misp-object"],
          firstSeen: event.date ? `${event.date}T00:00:00.000Z` : nowIso(),
          lastSeen: event.date ? `${event.date}T00:00:00.000Z` : nowIso(),
          content: object as Record<string, unknown>,
          createdAt: nowIso()
        },
        source
      )
    );
    for (const attribute of object.Attribute ?? []) {
      const matched = objects.find((candidate) => candidate.indicatorValue === attribute.value);
      if (!matched) {
        continue;
      }
      relationships.push({
        id: `${objectId}-${matched.id}`,
        sourceObjectId: matched.id,
        targetObjectId: objectId,
        relationshipType: "part-of",
        evidence: [object.name ? `MISP object ${object.name}` : "MISP object relationship"],
        confidence: matched.decayedConfidence,
        sourceId: source.id,
        createdAt: nowIso()
      });
    }
  }

  return { objects, relationships };
}
