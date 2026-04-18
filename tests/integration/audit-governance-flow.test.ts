import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-audit-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("audit governance flow", () => {
  it("writes versioned hash-chained audit events and exports governance evidence", async () => {
    const fastify = await createTestApp();

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "alert",
        title: "Audit governance case",
        text: "powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand SQBFAFgA from WINWORD.EXE on host WS-42 src=203.0.113.24",
        useKnowledge: false
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    const caseId = analyzeResponse.json().caseId;
    const legacyAudit = analyzeResponse.json().case.auditEntries;
    expect(legacyAudit[0].metadata.auditEventId).toMatch(/^audit_event_/);
    expect(legacyAudit[0].metadata.auditHash).toMatch(/^[a-f0-9]{64}$/);

    const eventsResponse = await fastify.inject({
      method: "GET",
      url: "/audit/events"
    });
    expect(eventsResponse.statusCode).toBe(200);
    expect(eventsResponse.json().integrity.verified).toBe(true);
    expect(eventsResponse.json().events.map((event: { action: string }) => event.action)).toEqual(
      expect.arrayContaining(["analysis.received", "analysis.completed"])
    );
    expect(eventsResponse.json().events[0].versions.map((version: { component: string }) => version.component)).toEqual(
      expect.arrayContaining(["prompt:defensive-analysis", "policy:safety", "model-provider", "code"])
    );

    const eventId = eventsResponse.json().events[0].id;
    const eventResponse = await fastify.inject({
      method: "GET",
      url: `/audit/events/${eventId}`
    });
    expect(eventResponse.statusCode).toBe(200);
    expect(eventResponse.json().hash).toBe(eventsResponse.json().events[0].hash);

    const caseAuditResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/audit`
    });
    expect(caseAuditResponse.statusCode).toBe(200);
    expect(caseAuditResponse.json().entries.length).toBeGreaterThan(0);
    expect(caseAuditResponse.json().events.every((event: { caseId: string }) => event.caseId === caseId)).toBe(true);
    expect(caseAuditResponse.json().integrity.verified).toBe(true);

    const exportResponse = await fastify.inject({
      method: "POST",
      url: "/audit/exports",
      payload: {
        actor: "auditor@example.test",
        filters: {
          caseId
        }
      }
    });
    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.json().actor).toBe("auditor@example.test");
    expect(exportResponse.json().integritySummary.verified).toBe(true);
    expect(exportResponse.json().includedEventIds.length).toBe(caseAuditResponse.json().events.length);

    const versionResponse = await fastify.inject({
      method: "GET",
      url: "/system/versions"
    });
    expect(versionResponse.statusCode).toBe(200);
    expect(versionResponse.json().versions.map((version: { component: string }) => version.component)).toEqual(
      expect.arrayContaining(["prompt:defensive-analysis", "policy:safety", "model-provider", "code"])
    );
  });
});
