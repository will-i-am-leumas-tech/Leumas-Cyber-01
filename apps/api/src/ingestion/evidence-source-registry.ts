import {
  evidenceSourceRegistrationSchema,
  evidenceSourceSchema,
  type EvidenceSource,
  type EvidenceSourceRegistration
} from "../schemas/ingestion.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { defaultParserIdForSourceType, reliabilityForSource } from "./source-reliability-service";

export class EvidenceSourceRegistry {
  private readonly sources = new Map<string, EvidenceSource>();

  register(input: EvidenceSourceRegistration): EvidenceSource {
    const parsed = evidenceSourceRegistrationSchema.parse(input);
    const timestamp = nowIso();
    const source = evidenceSourceSchema.parse({
      ...parsed,
      id: createId("evidence_source"),
      parserId: parsed.parserId ?? defaultParserIdForSourceType(parsed.type),
      reliabilityScore: reliabilityForSource(parsed),
      createdAt: timestamp,
      updatedAt: timestamp
    });

    this.sources.set(source.id, source);
    return source;
  }

  get(sourceId: string): EvidenceSource | null {
    return this.sources.get(sourceId) ?? null;
  }

  list(): EvidenceSource[] {
    return [...this.sources.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
