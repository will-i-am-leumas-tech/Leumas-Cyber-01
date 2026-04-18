import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-live-ingestion-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("live evidence ingestion flow", () => {
  it("registers an email source, ingests evidence, exposes job status, links evidence to a case, and audits custody", async () => {
    const fastify = await createTestApp();
    const emailJson = JSON.parse(await readFile("data/fixtures/ingestion/email-security-alert.json", "utf8"));

    const sourceResponse = await fastify.inject({
      method: "POST",
      url: "/ingestion/sources",
      payload: {
        name: "Email security fixture",
        type: "email_security",
        owner: "messaging-security",
        retentionClass: "standard",
        dataClass: "confidential"
      }
    });
    expect(sourceResponse.statusCode).toBe(200);
    const source = sourceResponse.json().source;
    expect(source.parserId).toBe("email_security-parser");

    const jobResponse = await fastify.inject({
      method: "POST",
      url: "/ingestion/jobs",
      payload: {
        sourceId: source.id,
        actor: "analyst@example.test",
        json: emailJson
      }
    });
    expect(jobResponse.statusCode).toBe(200);
    const jobBody = jobResponse.json();
    expect(jobBody.job.status).toBe("completed");
    expect(jobBody.evidenceRecords).toHaveLength(2);
    expect(jobBody.evidenceRecords[0].dataClass).toBe("confidential");
    expect(jobBody.sensitiveFindings.length).toBeGreaterThan(0);

    const statusResponse = await fastify.inject({
      method: "GET",
      url: `/ingestion/jobs/${jobBody.job.id}`
    });
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json().job.counters.recordsParsed).toBe(2);

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: "2026-04-16T09:09:00Z email report received user=alex@example.test src=198.51.100.24",
        useKnowledge: false
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    const caseId = analyzeResponse.json().caseId;

    const importResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/evidence/import`,
      payload: {
        evidenceIds: jobBody.evidenceRecords.map((record: { id: string }) => record.id),
        actor: "analyst@example.test",
        note: "Attach email security evidence to the triage case."
      }
    });
    expect(importResponse.statusCode).toBe(200);
    const importedCase = importResponse.json().case;
    expect(importedCase.evidenceRecords).toHaveLength(2);
    expect(importedCase.chainOfCustodyEntries.map((entry: { operation: string }) => entry.operation)).toContain("case_linked");
    expect(importedCase.auditEntries.map((entry: { action: string }) => entry.action)).toContain("ingestion.evidence_linked");
    expect(importedCase.result.ingestion.normalizedEvents.some((event: { eventType: string }) => event.eventType === "email_security_alert")).toBe(
      true
    );
  });
});
