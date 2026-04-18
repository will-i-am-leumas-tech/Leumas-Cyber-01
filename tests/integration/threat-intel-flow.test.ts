import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-threat-intel-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("threat intel flow", () => {
  it("enriches IOC analysis, records sightings, and updates lifecycle", async () => {
    const fastify = await createTestApp();

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "iocs",
        text: "suspicious.example.com 203.0.113.66"
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    expect(analyzeResponse.json().indicatorEnrichments.length).toBeGreaterThan(0);
    expect(analyzeResponse.json().case.indicatorEnrichments.length).toBeGreaterThan(0);
    expect(JSON.stringify(analyzeResponse.json().threatContextSummaries)).not.toMatch(/exploit procedure|attack steps/i);
    const caseId = analyzeResponse.json().caseId;
    const indicatorId = analyzeResponse
      .json()
      .indicatorEnrichments.find((enrichment: { indicatorValue: string }) => enrichment.indicatorValue === "suspicious.example.com")
      .indicatorId;

    const sightingResponse = await fastify.inject({
      method: "POST",
      url: "/threat-intel/sightings",
      payload: {
        caseId,
        indicatorId,
        source: "dns",
        asset: "WS-42",
        timestamp: "2026-04-16T12:00:00.000Z",
        eventRef: "dns:query:1"
      }
    });
    expect(sightingResponse.statusCode).toBe(200);

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
      expect.arrayContaining(["internal-sightings"])
    );

    const lifecycleResponse = await fastify.inject({
      method: "PATCH",
      url: `/threat-intel/indicators/${indicatorId}/lifecycle`,
      payload: {
        status: "false_positive",
        falsePositiveReason: "Confirmed benign business partner domain in this environment.",
        owner: "intel-owner@example.test"
      }
    });
    expect(lifecycleResponse.statusCode).toBe(200);
    expect(lifecycleResponse.json().indicatorLifecycle.status).toBe("false_positive");

    const detailResponse = await fastify.inject({
      method: "GET",
      url: `/threat-intel/indicators/${indicatorId}`
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().sightings).toHaveLength(1);
    expect(detailResponse.json().lifecycle[0].status).toBe("false_positive");

    const caseResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`
    });
    expect(caseResponse.json().internalSightings).toHaveLength(1);
    expect(caseResponse.json().auditEntries.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining(["threat_intel.enriched", "threat_intel.sighting_recorded"])
    );
  });
});
