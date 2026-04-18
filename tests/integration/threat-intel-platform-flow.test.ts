import { readFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-threat-intel-platform-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("threat intel platform flow", () => {
  it("imports intel, graphs relationships, plans retro-hunts, and creates a cited detection intent", async () => {
    const fastify = await createTestApp();
    const bundle = JSON.parse(await readFile("data/fixtures/threat-intel/stix-bundle.json", "utf8"));

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "iocs",
        text: "suspicious.example.com"
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    const caseId = analyzeResponse.json().caseId;

    const sourceResponse = await fastify.inject({
      method: "POST",
      url: "/threat-intel/sources",
      payload: {
        id: "local-stix",
        name: "Local STIX",
        type: "stix-file",
        trustScore: 0.82,
        owner: "intel",
        updateCadence: "manual",
        retentionDays: 90,
        enabled: true
      }
    });
    expect(sourceResponse.statusCode).toBe(200);

    const importResponse = await fastify.inject({
      method: "POST",
      url: "/threat-intel/feeds/import",
      payload: {
        caseId,
        sourceId: "local-stix",
        format: "stix",
        bundle
      }
    });
    expect(importResponse.statusCode).toBe(200);
    expect(importResponse.json().stixObjects.length).toBeGreaterThanOrEqual(2);
    expect(importResponse.json().intelRelationships[0].relationshipType).toBe("indicates");

    const graphResponse = await fastify.inject({
      method: "GET",
      url: "/threat-intel/graph/indicator--22222222-2222-4222-8222-222222222222"
    });
    expect(graphResponse.statusCode).toBe(200);
    expect(graphResponse.json().nodes.map((node: { id: string }) => node.id)).toEqual(
      expect.arrayContaining([
        "indicator--22222222-2222-4222-8222-222222222222",
        "malware--33333333-3333-4333-8333-333333333333"
      ])
    );
    expect(graphResponse.json().citations[0]).toContain("defensive sandbox telemetry");

    const sightingResponse = await fastify.inject({
      method: "POST",
      url: "/threat-intel/sightings",
      payload: {
        caseId,
        indicatorId: "indicator--22222222-2222-4222-8222-222222222222",
        source: "dns",
        asset: "WS-42",
        timestamp: "2026-04-17T13:00:00.000Z",
        eventRef: "dns:query:stix"
      }
    });
    expect(sightingResponse.statusCode).toBe(200);

    const detailResponse = await fastify.inject({
      method: "GET",
      url: "/threat-intel/indicators/indicator--22222222-2222-4222-8222-222222222222"
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().prevalence[0]).toMatchObject({
      telemetrySource: "dns",
      count: 1
    });

    const enrichResponse = await fastify.inject({
      method: "POST",
      url: "/threat-intel/enrich",
      payload: {
        caseId,
        indicators: [
          {
            type: "domain",
            value: "suspicious.example.com",
            normalized: "suspicious.example.com"
          }
        ]
      }
    });
    expect(enrichResponse.statusCode).toBe(200);
    expect(enrichResponse.json().indicatorEnrichments.map((item: { sourceId: string }) => item.sourceId)).toEqual(
      expect.arrayContaining(["local-stix"])
    );

    const retroHuntResponse = await fastify.inject({
      method: "POST",
      url: "/threat-intel/retro-hunts",
      payload: {
        caseId,
        indicatorIds: ["indicator--22222222-2222-4222-8222-222222222222"],
        dataSources: ["dns.logs", "proxy.logs"],
        timeRange: {
          start: "2026-04-10T00:00:00.000Z",
          end: "2026-04-18T00:00:00.000Z"
        }
      }
    });
    expect(retroHuntResponse.statusCode).toBe(200);
    expect(retroHuntResponse.json().retroHunt.results.every((query: { readOnly: boolean }) => query.readOnly)).toBe(true);

    const detectionResponse = await fastify.inject({
      method: "POST",
      url: "/threat-intel/detections/from-intel",
      payload: {
        caseId,
        indicatorIds: ["indicator--22222222-2222-4222-8222-222222222222"],
        severity: "high",
        dataSources: ["dns.logs"]
      }
    });
    expect(detectionResponse.statusCode).toBe(200);
    expect(detectionResponse.json().citations[0]).toContain("intel:local-stix");
    expect(detectionResponse.json().detectionIntent.evidenceRefs[0]).toContain("intel:local-stix");

    const caseResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`
    });
    expect(caseResponse.statusCode).toBe(200);
    expect(caseResponse.json().stixObjects.length).toBeGreaterThan(0);
    expect(caseResponse.json().retroHunts).toHaveLength(1);
    expect(caseResponse.json().detectionIntents.map((intent: { id: string }) => intent.id)).toEqual(
      expect.arrayContaining([detectionResponse.json().detectionIntent.id])
    );
    expect(JSON.stringify(caseResponse.json().auditEntries)).toContain("threat_intel.feed_imported");
  });
});
