import type {
  IntelRelationship,
  IntelSource,
  StixObjectRecord,
  StixObjectType
} from "../schemas/threat-intel-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { applyConfidenceDecay, expiresAtForSource } from "./confidence-decay-service";

interface StixObjectInput {
  id?: string;
  type?: string;
  name?: string;
  pattern?: string;
  confidence?: number;
  labels?: string[];
  created?: string;
  modified?: string;
  valid_until?: string;
  source_ref?: string;
  target_ref?: string;
  relationship_type?: string;
  description?: string;
}

const stixTypes = new Set<StixObjectType>([
  "indicator",
  "malware",
  "tool",
  "campaign",
  "intrusion-set",
  "threat-actor",
  "report",
  "relationship",
  "attack-pattern",
  "identity",
  "observed-data",
  "sighting"
]);

const indicatorTypeMap: Record<string, string> = {
  "domain-name": "domain",
  "ipv4-addr": "ipv4",
  "ipv6-addr": "ipv6",
  url: "url",
  "email-addr": "email",
  file: "file_hash"
};

function stixObjectType(value: string | undefined): StixObjectType {
  return value && stixTypes.has(value as StixObjectType) ? (value as StixObjectType) : "other";
}

function confidenceFromStix(value: number | undefined): number {
  if (value === undefined) {
    return 0.5;
  }
  return value > 1 ? Math.max(0, Math.min(1, value / 100)) : Math.max(0, Math.min(1, value));
}

function extractIndicator(pattern: string | undefined): { indicatorType?: string; indicatorValue?: string } {
  if (!pattern) {
    return {};
  }

  const hashMatch = pattern.match(/\[file:hashes\.(?:'([^']+)'|([A-Za-z0-9_-]+))\s*=\s*'([^']+)'\]/);
  if (hashMatch) {
    return {
      indicatorType: (hashMatch[1] ?? hashMatch[2] ?? "hash").toLowerCase().replace("-", ""),
      indicatorValue: hashMatch[3]
    };
  }

  const standardMatch = pattern.match(/\[([^:\]]+):[^=\]]+=\s*'([^']+)'\]/);
  if (standardMatch) {
    const rawType = standardMatch[1];
    const rawValue = standardMatch[2];
    return {
      indicatorType: indicatorTypeMap[rawType] ?? rawType,
      indicatorValue: rawValue
    };
  }

  return {};
}

function labelForObject(object: StixObjectInput, indicatorValue?: string): string {
  return object.name ?? indicatorValue ?? object.id ?? object.type ?? "stix-object";
}

export function parseStixBundle(bundle: Record<string, unknown>, source: IntelSource): {
  objects: StixObjectRecord[];
  relationships: IntelRelationship[];
} {
  const rawObjects = Array.isArray(bundle.objects) ? (bundle.objects as StixObjectInput[]) : [];
  const objects: StixObjectRecord[] = [];
  const relationships: IntelRelationship[] = [];

  for (const rawObject of rawObjects) {
    const type = stixObjectType(rawObject.type);
    const stixId = rawObject.id ?? createId("stix_object");
    const timestamp = rawObject.modified ?? rawObject.created ?? nowIso();
    const indicator = extractIndicator(rawObject.pattern);

    if (type === "relationship" && rawObject.source_ref && rawObject.target_ref) {
      relationships.push({
        id: stixId,
        sourceObjectId: rawObject.source_ref,
        targetObjectId: rawObject.target_ref,
        relationshipType: rawObject.relationship_type ?? "related-to",
        evidence: [rawObject.description ?? `STIX relationship ${stixId}`],
        confidence: confidenceFromStix(rawObject.confidence) * source.trustScore,
        sourceId: source.id,
        createdAt: nowIso()
      });
      continue;
    }

    const record: StixObjectRecord = {
      id: stixId,
      stixId,
      type,
      name: labelForObject(rawObject, indicator.indicatorValue),
      indicatorType: indicator.indicatorType,
      indicatorValue: indicator.indicatorValue,
      pattern: rawObject.pattern,
      sourceId: source.id,
      confidence: confidenceFromStix(rawObject.confidence),
      decayedConfidence: confidenceFromStix(rawObject.confidence),
      labels: rawObject.labels ?? [],
      firstSeen: rawObject.created,
      lastSeen: rawObject.modified ?? rawObject.created,
      expiresAt: rawObject.valid_until ?? expiresAtForSource(source, timestamp),
      content: rawObject as Record<string, unknown>,
      createdAt: nowIso()
    };
    objects.push(applyConfidenceDecay(record, source));
  }

  return { objects, relationships };
}
