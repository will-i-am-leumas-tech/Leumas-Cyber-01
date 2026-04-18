import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-knowledge-eval-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("knowledge grounding eval", () => {
  it("keeps analysis grounded in approved current tenant knowledge", async () => {
    const fastify = await createTestApp();
    const windowsBaseline = await readFile("data/fixtures/knowledge/windows-logging-baseline.md", "utf8");
    const tenantRunbook = await readFile("data/fixtures/knowledge/tenant-specific-runbook.md", "utf8");

    await fastify.inject({
      method: "POST",
      url: "/knowledge/sources",
      payload: {
        title: "Windows Logging Baseline",
        text: windowsBaseline,
        uri: "local://knowledge/windows-logging",
        type: "markdown",
        trustTier: "internal",
        owner: "security-platform",
        tenantId: "tenant_default",
        approvalState: "approved",
        version: "2026.1",
        reviewAt: "2027-01-01T00:00:00.000Z"
      }
    });
    await fastify.inject({
      method: "POST",
      url: "/knowledge/sources",
      payload: {
        title: "Tenant Partner Identity Runbook",
        text: tenantRunbook,
        uri: "local://knowledge/tenant-partner",
        type: "markdown",
        trustTier: "internal",
        owner: "partner-security",
        tenantId: "tenant_partner",
        approvalState: "approved",
        version: "2026.1",
        reviewAt: "2027-03-01T00:00:00.000Z"
      }
    });

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: "2026-04-18T09:00:00Z Event ID 4625 failed logon user=admin src=203.0.113.10",
        knowledgeFilters: {
          tenantId: "tenant_default"
        }
      }
    });

    expect(analyzeResponse.statusCode).toBe(200);
    const body = analyzeResponse.json();
    const citedTitles = body.result.knowledge.results.map((result: { citation: { title: string } }) => result.citation.title);
    const serializedKnowledge = JSON.stringify(body.result.knowledge);

    expect(citedTitles).toContain("Windows Logging Baseline");
    expect(citedTitles).not.toContain("Tenant Partner Identity Runbook");
    expect(serializedKnowledge).not.toContain("tenant_partner");
    expect(body.case.knowledgeCitationQualities.length).toBeGreaterThan(0);
    expect(body.result.evidence.join(" ")).toContain("quality relevance=");
    expect(body.result.reportMarkdown).toContain("Windows Logging Baseline");
    expect(body.case.auditEntries.map((entry: { action: string }) => entry.action)).toContain("knowledge.retrieved");
  });
});
