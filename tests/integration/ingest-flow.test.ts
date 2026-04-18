import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-ingest-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function multipartPayload(boundary: string, files: Array<{ field: string; filename: string; contentType: string; body: string }>): string {
  const parts = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="mode"',
    "",
    "logs"
  ];

  for (const file of files) {
    parts.push(
      `--${boundary}`,
      `Content-Disposition: form-data; name="${file.field}"; filename="${file.filename}"`,
      `Content-Type: ${file.contentType}`,
      "",
      file.body
    );
  }

  parts.push(`--${boundary}--`, "");
  return parts.join("\r\n");
}

describe("ingest flow", () => {
  it("accepts multi-file upload and exposes normalized case events and entities", async () => {
    const fastify = await createTestApp();
    const csvText = await readFile("data/fixtures/ingest/mixed-case-bundle/auth.csv", "utf8");
    const jsonText = await readFile("data/fixtures/ingest/mixed-case-bundle/process.json", "utf8");
    const boundary = "----leumas-ingest-boundary";

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`
      },
      payload: multipartPayload(boundary, [
        { field: "file1", filename: "auth.csv", contentType: "text/csv", body: csvText },
        { field: "file2", filename: "process.json", contentType: "application/json", body: jsonText }
      ])
    });

    expect(analyzeResponse.statusCode).toBe(200);
    const body = analyzeResponse.json();
    expect(body.case.inputType).toBe("uploaded:2-files");
    expect(body.result.ingestion.artifacts).toHaveLength(2);
    expect(body.result.ingestion.normalizedEvents.length).toBeGreaterThanOrEqual(3);
    expect(body.result.timeline.length).toBeGreaterThanOrEqual(3);
    expect(body.case.auditEntries.map((entry: { action: string }) => entry.action)).toContain("ingest.normalized");

    const eventsResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${body.caseId}/events`
    });
    expect(eventsResponse.statusCode).toBe(200);
    expect(eventsResponse.json().events.length).toBe(body.result.ingestion.normalizedEvents.length);

    const entitiesResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${body.caseId}/entities`
    });
    expect(entitiesResponse.statusCode).toBe(200);
    expect(entitiesResponse.json().entities.some((entity: { normalized: string }) => entity.normalized === "203.0.113.77")).toBe(true);
  });

  it("adds artifacts to an existing case", async () => {
    const fastify = await createTestApp();
    const createResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: "2026-04-16T08:00:00Z failed login user=admin src=203.0.113.77"
      }
    });
    const caseId = createResponse.json().caseId;
    const csvText = await readFile("data/fixtures/ingest/mixed-case-bundle/auth.csv", "utf8");

    const appendResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/artifacts`,
      payload: {
        filename: "auth.csv",
        mediaType: "text/csv",
        text: csvText
      }
    });

    expect(appendResponse.statusCode).toBe(200);
    expect(appendResponse.json().ingestion.artifacts.length).toBeGreaterThan(1);
    expect(appendResponse.json().ingestion.normalizedEvents.length).toBeGreaterThan(1);
  });
});
