import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-connectors-v2-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("connector v2 flow", () => {
  it("lists connector health, queries read-only records, imports evidence, and audits the import", async () => {
    const fastify = await createTestApp();

    const analyze = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: "2026-04-16T09:00:00Z failed login user=admin src=203.0.113.10",
        useKnowledge: false
      }
    });
    expect(analyze.statusCode).toBe(200);
    const caseId = analyze.json().caseId;

    const connectors = await fastify.inject({
      method: "GET",
      url: "/connectors"
    });
    expect(connectors.statusCode).toBe(200);
    expect(connectors.json().connectors.map((connector: { id: string }) => connector.id)).toEqual(
      expect.arrayContaining(["sentinel-fixture", "defender-fixture", "entra-fixture", "aws-security-fixture"])
    );

    const health = await fastify.inject({
      method: "GET",
      url: "/connectors/health"
    });
    expect(health.statusCode).toBe(200);
    expect(health.json().connectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          connectorId: "entra-fixture",
          status: "healthy"
        })
      ])
    );

    const query = await fastify.inject({
      method: "POST",
      url: "/connectors/entra-fixture/query",
      payload: {
        operation: "search_signins",
        actor: "analyst@example.test",
        query: "203.0.113.10",
        limit: 2
      }
    });
    expect(query.statusCode).toBe(200);
    expect(query.json().result.records).toHaveLength(2);

    const imported = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/connectors/entra-fixture/import`,
      payload: {
        operation: "search_signins",
        actor: "analyst@example.test",
        query: "203.0.113.10",
        limit: 2
      }
    });
    expect(imported.statusCode).toBe(200);
    expect(imported.json().evidenceRefs).toHaveLength(2);
    expect(imported.json().case.connectorEvidenceRefs[0]).toMatchObject({
      connectorId: "entra-fixture",
      dataClass: "confidential"
    });
    expect(imported.json().case.auditEntries.map((entry: { action: string }) => entry.action)).toContain(
      "connector.evidence_imported"
    );

    const denied = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/connectors/entra-fixture/import`,
      payload: {
        operation: "disable_user",
        actor: "analyst@example.test",
        query: "admin@example.test"
      }
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().reason).toBe("operation_not_allowed");
  });
});
