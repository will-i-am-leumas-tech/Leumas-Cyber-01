import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { IntelSource } from "../../apps/api/src/schemas/threat-intel-v2.schema";
import { applyConfidenceDecay, lifecycleStatusForRecord } from "../../apps/api/src/threat-intel/confidence-decay-service";
import { buildIntelDetection } from "../../apps/api/src/threat-intel/intel-to-detection-service";
import { importMispEvent } from "../../apps/api/src/threat-intel/misp-connector";
import { buildRelationshipGraph } from "../../apps/api/src/threat-intel/relationship-graph-service";
import { buildRetroHuntRequest } from "../../apps/api/src/threat-intel/retro-hunt-builder";
import { parseStixBundle } from "../../apps/api/src/threat-intel/stix-parser";

const source: IntelSource = {
  id: "local-stix",
  name: "Local STIX",
  type: "stix-file",
  trustScore: 0.82,
  owner: "intel",
  updateCadence: "manual",
  retentionDays: 90,
  enabled: true,
  createdAt: "2026-04-18T00:00:00.000Z"
};

describe("threat intel platform services", () => {
  it("parses STIX indicators and evidence-backed relationships", async () => {
    const bundle = JSON.parse(await readFile("data/fixtures/threat-intel/stix-bundle.json", "utf8"));
    const result = parseStixBundle(bundle, source);

    const indicator = result.objects.find((object) => object.type === "indicator");
    expect(indicator).toMatchObject({
      indicatorType: "domain",
      indicatorValue: "suspicious.example.com",
      sourceId: "local-stix"
    });
    expect(indicator?.decayedConfidence).toBeGreaterThan(0.6);
    expect(result.relationships[0]).toMatchObject({
      relationshipType: "indicates",
      sourceObjectId: "indicator--22222222-2222-4222-8222-222222222222"
    });
  });

  it("imports MISP attributes as defensive indicator records", async () => {
    const event = JSON.parse(await readFile("data/fixtures/threat-intel/misp-event.json", "utf8"));
    const result = importMispEvent(event, { ...source, id: "partner-misp", type: "misp" });

    expect(result.objects.map((object) => object.indicatorValue)).toEqual(
      expect.arrayContaining(["203.0.113.66", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"])
    );
    expect(result.relationships[0].relationshipType).toBe("part-of");
  });

  it("decays confidence and flags expired intel", () => {
    const bundleRecord = parseStixBundle(
      {
        objects: [
          {
            type: "indicator",
            id: "indicator--old",
            created: "2025-01-01T00:00:00.000Z",
            modified: "2025-01-01T00:00:00.000Z",
            pattern: "[domain-name:value = 'old.example.com']",
            confidence: 90
          }
        ]
      },
      { ...source, retentionDays: 30 }
    ).objects[0];
    const decayed = applyConfidenceDecay(bundleRecord, { ...source, retentionDays: 30 }, "2026-04-18T00:00:00.000Z");

    expect(decayed.decayedConfidence).toBeLessThan(0.4);
    expect(lifecycleStatusForRecord(decayed, "2026-04-18T00:00:00.000Z")).toBe("expired");
  });

  it("builds graphs, read-only retro-hunts, and cited detection intents", async () => {
    const bundle = JSON.parse(await readFile("data/fixtures/threat-intel/stix-bundle.json", "utf8"));
    const result = parseStixBundle(bundle, source);
    const graph = buildRelationshipGraph("indicator--22222222-2222-4222-8222-222222222222", result.objects, result.relationships);
    const retroHunt = buildRetroHuntRequest(
      {
        indicatorIds: ["indicator--22222222-2222-4222-8222-222222222222"],
        dataSources: ["dns.logs"],
        timeRange: {
          start: "2026-04-10T00:00:00.000Z",
          end: "2026-04-18T00:00:00.000Z"
        }
      },
      result.objects
    );
    const detection = buildIntelDetection(
      {
        indicatorIds: ["indicator--22222222-2222-4222-8222-222222222222"],
        severity: "high",
        dataSources: ["dns.logs"]
      },
      result.objects
    );

    expect(graph.nodes.length).toBeGreaterThan(1);
    expect(graph.citations[0]).toContain("defensive sandbox telemetry");
    expect(retroHunt.results[0].readOnly).toBe(true);
    expect(retroHunt.results[0].query).toContain("project");
    expect(detection.detectionIntent.evidenceRefs[0]).toContain("intel:local-stix");
    expect(JSON.stringify({ graph, retroHunt, detection })).not.toMatch(/exploit procedure|credential theft/i);
  });
});
