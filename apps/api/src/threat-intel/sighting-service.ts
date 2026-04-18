import type { CreateInternalSightingInput, InternalSighting } from "../schemas/threat-intel.schema";
import type { InternalPrevalenceRecord } from "../schemas/threat-intel-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function buildInternalSighting(input: CreateInternalSightingInput): InternalSighting {
  return {
    id: createId("internal_sighting"),
    caseId: input.caseId,
    indicatorId: input.indicatorId,
    source: input.source,
    asset: input.asset,
    timestamp: input.timestamp,
    eventRef: input.eventRef
  };
}

export function updateInternalPrevalence(
  existing: InternalPrevalenceRecord[],
  sighting: InternalSighting,
  indicatorValue?: string
): InternalPrevalenceRecord[] {
  const current = existing.find(
    (record) => record.indicatorId === sighting.indicatorId && record.telemetrySource === sighting.source
  );
  const caseRefs = sighting.caseId ? [sighting.caseId] : [];

  if (!current) {
    return [
      ...existing,
      {
        id: createId("internal_prevalence"),
        indicatorId: sighting.indicatorId,
        indicatorValue,
        telemetrySource: sighting.source,
        count: 1,
        lastSeen: sighting.timestamp,
        caseRefs,
        prevalenceScore: 0.25,
        createdAt: nowIso()
      }
    ];
  }

  const count = current.count + 1;
  return existing.map((record) =>
    record.id === current.id
      ? {
          ...record,
          indicatorValue: record.indicatorValue ?? indicatorValue,
          count,
          lastSeen: sighting.timestamp > record.lastSeen ? sighting.timestamp : record.lastSeen,
          caseRefs: [...new Set([...record.caseRefs, ...caseRefs])],
          prevalenceScore: Math.min(1, Math.round((0.2 + count * 0.15) * 100) / 100)
        }
      : record
  );
}
