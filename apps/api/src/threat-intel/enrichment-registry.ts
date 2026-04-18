import { createHash } from "node:crypto";
import type { Indicator } from "../schemas/result.schema";
import type { IndicatorEnrichment, InternalSighting, ThreatContextSummary, ThreatIntelSource } from "../schemas/threat-intel.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function indicatorIdFor(indicator: Pick<Indicator, "type" | "normalized">): string {
  const digest = createHash("sha256").update(`${indicator.type}:${indicator.normalized.toLowerCase()}`).digest("hex").slice(0, 20);
  return `indicator_${digest}`;
}

export interface ReputationRecord {
  type: string;
  value: string;
  sourceId: string;
  verdict: IndicatorEnrichment["verdict"];
  confidence: number;
  tags: string[];
  firstSeen?: string;
  lastSeen?: string;
}

export function applySourceReliability(confidence: number, source: ThreatIntelSource): number {
  return Math.round(confidence * source.reliability * 100) / 100;
}

export function buildEnrichments(input: {
  caseId?: string;
  indicators: Indicator[];
  sources: ThreatIntelSource[];
  reputation: ReputationRecord[];
  sightings: InternalSighting[];
}): { enrichments: IndicatorEnrichment[]; summaries: ThreatContextSummary[] } {
  const enabledSources = new Map(input.sources.filter((source) => source.enabled).map((source) => [source.id, source]));
  const enrichments: IndicatorEnrichment[] = [];
  const summaries: ThreatContextSummary[] = [];

  for (const indicator of input.indicators) {
    const indicatorId = indicatorIdFor(indicator);
    const matchedReputation = input.reputation.filter(
      (record) => record.type === indicator.type && record.value.toLowerCase() === indicator.normalized.toLowerCase()
    );
    const matchedSightings = input.sightings.filter((sighting) => sighting.indicatorId === indicatorId);

    for (const record of matchedReputation) {
      const source = enabledSources.get(record.sourceId);
      if (!source) {
        continue;
      }
      enrichments.push({
        id: createId("indicator_enrichment"),
        caseId: input.caseId,
        indicatorId,
        indicatorType: indicator.type,
        indicatorValue: indicator.normalized,
        sourceId: source.id,
        verdict: record.verdict,
        confidence: applySourceReliability(record.confidence, source),
        tags: record.tags,
        firstSeen: record.firstSeen,
        lastSeen: record.lastSeen,
        createdAt: nowIso()
      });
    }

    if (matchedSightings.length > 0) {
      const internalSource = enabledSources.get("internal-sightings");
      if (internalSource) {
        enrichments.push({
          id: createId("indicator_enrichment"),
          caseId: input.caseId,
          indicatorId,
          indicatorType: indicator.type,
          indicatorValue: indicator.normalized,
          sourceId: internalSource.id,
          verdict: "suspicious",
          confidence: applySourceReliability(Math.min(0.95, 0.55 + matchedSightings.length * 0.1), internalSource),
          tags: ["internal-sighting"],
          firstSeen: matchedSightings.map((sighting) => sighting.timestamp).sort()[0],
          lastSeen: matchedSightings.map((sighting) => sighting.timestamp).sort().at(-1),
          createdAt: nowIso()
        });
      }
    }

    const indicatorEnrichments = enrichments.filter((enrichment) => enrichment.indicatorId === indicatorId);
    if (indicatorEnrichments.length > 0) {
      const highest = indicatorEnrichments.reduce((best, current) => (current.confidence > best.confidence ? current : best));
      summaries.push({
        id: createId("threat_context"),
        caseId: input.caseId,
        indicatorId,
        defensiveSummary: `${indicator.normalized} has ${indicatorEnrichments.length} enrichment result${indicatorEnrichments.length === 1 ? "" : "s"}; highest verdict is ${highest.verdict}.`,
        relatedBehaviors: [...new Set(indicatorEnrichments.flatMap((enrichment) => enrichment.tags))],
        recommendedHandling: [
          "Correlate the indicator with internal telemetry before enforcement.",
          "Use time-bounded watchlists or blocklists only after analyst approval.",
          "Document source reliability, confidence, and expiration."
        ],
        confidence: highest.confidence,
        createdAt: nowIso()
      });
    }
  }

  return { enrichments, summaries };
}
