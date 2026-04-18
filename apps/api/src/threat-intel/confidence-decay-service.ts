import type { IntelSource, StixObjectRecord } from "../schemas/threat-intel-v2.schema";
import { nowIso } from "../utils/time";

const dayMs = 24 * 60 * 60 * 1000;

function daysBetween(start: string | undefined, end: string): number {
  if (!start) {
    return 0;
  }
  const diff = Date.parse(end) - Date.parse(start);
  return Number.isFinite(diff) && diff > 0 ? Math.floor(diff / dayMs) : 0;
}

export function expiresAtForSource(source: IntelSource, firstSeen = nowIso()): string {
  return new Date(Date.parse(firstSeen) + source.retentionDays * dayMs).toISOString();
}

export function applyConfidenceDecay(record: StixObjectRecord, source: IntelSource, at = nowIso()): StixObjectRecord {
  const ageDays = daysBetween(record.lastSeen ?? record.firstSeen ?? record.createdAt, at);
  const halfLives = Math.floor(ageDays / Math.max(1, Math.floor(source.retentionDays / 2)));
  const decayedConfidence = Math.max(0.05, Math.round(record.confidence * source.trustScore * Math.pow(0.75, halfLives) * 100) / 100);
  return {
    ...record,
    decayedConfidence,
    expiresAt: record.expiresAt ?? expiresAtForSource(source, record.firstSeen ?? record.createdAt)
  };
}

export function lifecycleStatusForRecord(record: Pick<StixObjectRecord, "expiresAt" | "decayedConfidence">, at = nowIso()): "active" | "expired" {
  if (record.expiresAt && record.expiresAt < at) {
    return "expired";
  }
  return record.decayedConfidence < 0.1 ? "expired" : "active";
}
