import type { NormalizedEvent } from "../schemas/ingest.schema";
import type { DeduplicationRecord, EvidenceRecord } from "../schemas/ingestion.schema";
import { sha256Text } from "../reasoning/hash";
import { nowIso } from "../utils/time";

function canonicalValue(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function fingerprintEvent(event: NormalizedEvent): string {
  return sha256Text(
    [
      canonicalValue(event.timestamp),
      canonicalValue(event.eventType),
      canonicalValue(event.actor),
      canonicalValue(event.asset),
      canonicalValue(event.network.srcIp),
      canonicalValue(event.network.dstIp),
      canonicalValue(event.process.image),
      canonicalValue(event.rawRef.excerpt)
    ].join("|")
  );
}

export class DeduplicationService {
  private readonly records = new Map<string, DeduplicationRecord>();
  private readonly canonicalEvidenceByFingerprint = new Map<string, string>();

  record(evidence: EvidenceRecord): { duplicate: boolean; duplicateOf?: string; record: DeduplicationRecord } {
    const timestamp = nowIso();
    const existing = this.records.get(evidence.fingerprint);
    const duplicateOf = this.canonicalEvidenceByFingerprint.get(evidence.fingerprint);

    if (!existing) {
      const record: DeduplicationRecord = {
        fingerprint: evidence.fingerprint,
        firstSeen: timestamp,
        lastSeen: timestamp,
        sourceIds: [evidence.sourceId],
        evidenceIds: [evidence.id],
        duplicateCount: 0
      };
      this.records.set(evidence.fingerprint, record);
      this.canonicalEvidenceByFingerprint.set(evidence.fingerprint, evidence.id);
      return {
        duplicate: false,
        record
      };
    }

    const updated: DeduplicationRecord = {
      ...existing,
      lastSeen: timestamp,
      sourceIds: [...new Set([...existing.sourceIds, evidence.sourceId])],
      evidenceIds: [...new Set([...existing.evidenceIds, evidence.id])],
      duplicateCount: existing.duplicateCount + 1
    };
    this.records.set(evidence.fingerprint, updated);
    return {
      duplicate: true,
      duplicateOf,
      record: updated
    };
  }

  list(): DeduplicationRecord[] {
    return [...this.records.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }
}
