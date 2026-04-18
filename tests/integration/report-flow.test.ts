import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-reports-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("report flow", () => {
  it("creates, updates, versions, and redacts an evidence-linked report draft", async () => {
    const fastify = await createTestApp();
    const alert = JSON.parse(await readFile("data/fixtures/alerts/powershell-encoded.json", "utf8"));

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "alert",
        json: alert
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    expect(analyzeResponse.json().result.reportMarkdown).toContain("## Overview");
    const caseId = analyzeResponse.json().caseId;

    const createReportResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/reports`,
      payload: {
        templateId: "executive-template",
        actor: "analyst@example.test"
      }
    });
    expect(createReportResponse.statusCode).toBe(200);
    expect(createReportResponse.json().reportDraft.citations.length).toBeGreaterThan(0);
    expect(createReportResponse.json().citationValidation.passed).toBe(true);
    const reportId = createReportResponse.json().reportDraft.id;

    const editedMarkdown = [
      createReportResponse.json().reportDraft.contentMarkdown,
      "",
      "Reviewer: analyst@example.test",
      "Observed source 203.0.113.10 user=admin token=example-review-token"
    ].join("\n");
    const patchResponse = await fastify.inject({
      method: "PATCH",
      url: `/cases/${caseId}/reports/${reportId}`,
      payload: {
        contentMarkdown: editedMarkdown,
        status: "in_review",
        editor: "lead@example.test",
        diffSummary: "Added reviewer context for redaction testing."
      }
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().reportVersion.version).toBe(2);
    expect(patchResponse.json().reportDraft.status).toBe("in_review");

    const redactionResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/reports/${reportId}/redact`,
      payload: {
        audience: "external"
      }
    });
    expect(redactionResponse.statusCode).toBe(200);
    expect(redactionResponse.json().redaction.redactedMarkdown).toContain("[REDACTED_EMAIL]");
    expect(redactionResponse.json().redaction.redactedMarkdown).toContain("[REDACTED_IP]");
    expect(redactionResponse.json().redaction.redactedMarkdown).toContain("[REDACTED_SECRET]");

    const listResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/reports`
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().reportTemplates.map((template: { id: string }) => template.id)).toEqual(
      expect.arrayContaining(["executive-template", "technical-template"])
    );
    expect(listResponse.json().reportVersions).toHaveLength(2);
    expect(listResponse.json().redactionResults).toHaveLength(1);

    const caseResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`
    });
    expect(caseResponse.json().auditEntries.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining(["report.created", "report.updated", "report.redacted"])
    );
  });
});
