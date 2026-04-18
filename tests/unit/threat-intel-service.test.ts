import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { Indicator } from "../../apps/api/src/schemas/result.schema";
import type { InternalSighting, ThreatIntelSource } from "../../apps/api/src/schemas/threat-intel.schema";
import { applySourceReliability, buildEnrichments, indicatorIdFor } from "../../apps/api/src/threat-intel/enrichment-registry";
import { buildIndicatorLifecycle, isIndicatorLifecycleExpired } from "../../apps/api/src/threat-intel/lifecycle-service";

const indicator: Indicator = {
  type: "domain",
  value: "suspicious.example.com",
  normalized: "suspicious.example.com",
  source: "test"
};

const sources: ThreatIntelSource[] = [
  {
    id: "local-reputation",
    name: "Local Reputation",
    type: "local",
    trustTier: "internal",
    reliability: 0.9,
    terms: "Internal defensive use only.",
    enabled: true
  },
  {
    id: "community-feed",
    name: "Community Feed",
    type: "external",
    trustTier: "community",
    reliability: 0.5,
    terms: "Verify before enforcement.",
    enabled: true
  },
  {
    id: "internal-sightings",
    name: "Internal Sightings",
    type: "internal",
    trustTier: "internal",
    reliability: 0.85,
    terms: "Internal telemetry.",
    enabled: true
  }
];

describe("threat intel services", () => {
  it("merges multiple source enrichments and internal sightings", () => {
    const indicatorId = indicatorIdFor(indicator);
    const sightings: InternalSighting[] = [
      {
        id: "sighting_1",
        indicatorId,
        source: "dns",
        asset: "WS-42",
        timestamp: "2026-04-16T12:00:00.000Z",
        eventRef: "dns:query:1"
      }
    ];
    const result = buildEnrichments({
      indicators: [indicator],
      sources,
      sightings,
      reputation: [
        {
          type: "domain",
          value: "suspicious.example.com",
          sourceId: "local-reputation",
          verdict: "malicious",
          confidence: 0.9,
          tags: ["watchlist"]
        },
        {
          type: "domain",
          value: "suspicious.example.com",
          sourceId: "community-feed",
          verdict: "suspicious",
          confidence: 0.8,
          tags: ["community"]
        }
      ]
    });

    expect(result.enrichments.map((item) => item.sourceId)).toEqual(
      expect.arrayContaining(["local-reputation", "community-feed", "internal-sightings"])
    );
    expect(result.summaries[0].defensiveSummary).toContain("highest verdict");
    expect(JSON.stringify(result.summaries)).not.toMatch(/attack steps|exploit procedure/i);
  });

  it("reduces confidence for lower reliability sources", () => {
    const high = applySourceReliability(0.8, sources[0]);
    const low = applySourceReliability(0.8, sources[1]);

    expect(low).toBeLessThan(high);
  });

  it("flags expired indicator lifecycle records", async () => {
    const fixture = JSON.parse(await readFile("data/fixtures/threat-intel/expired-indicator.json", "utf8"));
    const lifecycle = buildIndicatorLifecycle("indicator_1", fixture);

    expect(isIndicatorLifecycleExpired(lifecycle, "2026-04-17T00:00:00.000Z")).toBe(true);
    expect(lifecycle.status).toBe("expired");
  });
});
