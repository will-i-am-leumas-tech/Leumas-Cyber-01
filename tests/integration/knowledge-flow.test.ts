import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-knowledge-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("knowledge flow", () => {
  it("ingests, searches, and cites local knowledge during analysis", async () => {
    const fastify = await createTestApp();
    const iisRunbook = await readFile("data/fixtures/knowledge/iis-hardening-runbook.md", "utf8");

    const ingestResponse = await fastify.inject({
      method: "POST",
      url: "/knowledge/sources",
      payload: {
        title: "IIS Hardening Runbook",
        text: iisRunbook,
        uri: "local://runbooks/iis-hardening",
        type: "markdown",
        trustTier: "internal",
        version: "2026.1",
        reviewAt: "2027-01-01T00:00:00.000Z"
      }
    });

    expect(ingestResponse.statusCode).toBe(200);
    expect(ingestResponse.json().chunks.length).toBeGreaterThan(0);

    const searchResponse = await fastify.inject({
      method: "POST",
      url: "/knowledge/search",
      payload: {
        query: "IIS hardening TLS application pools logging",
        limit: 2
      }
    });

    expect(searchResponse.statusCode).toBe(200);
    expect(searchResponse.json().results[0].citation.title).toBe("IIS Hardening Runbook");

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "hardening",
        text: "How do I harden IIS on a Windows Server?"
      }
    });

    expect(analyzeResponse.statusCode).toBe(200);
    const body = analyzeResponse.json();
    expect(body.result.knowledge.results.length).toBeGreaterThan(0);
    expect(body.result.reportMarkdown).toContain("## Knowledge Sources");
    expect(body.result.reportMarkdown).toContain("IIS Hardening Runbook");
    expect(body.case.auditEntries.map((entry: { action: string }) => entry.action)).toContain("knowledge.retrieved");
    expect(body.case.recommendations.join(" ")).toContain("source: IIS Hardening Runbook");
  });

  it("surfaces stale-source warnings in analysis", async () => {
    const fastify = await createTestApp();
    const staleRunbook = await readFile("data/fixtures/knowledge/stale-source.md", "utf8");

    await fastify.inject({
      method: "POST",
      url: "/knowledge/sources",
      payload: {
        title: "Legacy Hardening Notes",
        text: staleRunbook,
        uri: "local://runbooks/legacy-hardening",
        type: "markdown",
        trustTier: "community",
        version: "legacy",
        reviewAt: "2024-01-01T00:00:00.000Z"
      }
    });

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "hardening",
        text: "How do I harden IIS?"
      }
    });

    expect(analyzeResponse.statusCode).toBe(200);
    const body = analyzeResponse.json();
    expect(body.result.knowledge.warnings.join(" ")).toContain("past its review date");
    expect(body.result.notes.join(" ")).toContain("past its review date");
  });
});
