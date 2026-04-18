import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { chunkKnowledgeDocument } from "../../apps/api/src/knowledge/chunker";
import { retrieveKnowledge } from "../../apps/api/src/knowledge/retriever";
import { isKnowledgeSourceStale } from "../../apps/api/src/knowledge/source-policy";
import type { KnowledgeSource } from "../../apps/api/src/schemas/knowledge.schema";
import { sha256Text } from "../../apps/api/src/reasoning/hash";

function source(overrides: Partial<KnowledgeSource>): KnowledgeSource {
  return {
    id: overrides.id ?? "source_test",
    title: overrides.title ?? "Test Source",
    uri: overrides.uri ?? "local://test",
    type: overrides.type ?? "markdown",
    trustTier: overrides.trustTier ?? "internal",
    tenantId: overrides.tenantId ?? "tenant_default",
    approvalState: overrides.approvalState ?? "approved",
    taxonomyTags: overrides.taxonomyTags ?? [],
    version: overrides.version ?? "1",
    reviewAt: overrides.reviewAt,
    owner: overrides.owner,
    createdAt: "2026-04-16T00:00:00.000Z",
    hash: overrides.hash ?? sha256Text("test")
  };
}

describe("knowledge service primitives", () => {
  it("chunks markdown while preserving heading and line location metadata", async () => {
    const text = await readFile("data/fixtures/knowledge/iis-hardening-runbook.md", "utf8");
    const chunks = chunkKnowledgeDocument({
      sourceId: "source_iis",
      title: "IIS Hardening Runbook",
      text,
      type: "markdown"
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.some((chunk) => chunk.location.includes("TLS and Certificates lines"))).toBe(true);
    expect(chunks.some((chunk) => chunk.searchText.includes("application pool"))).toBe(true);
  });

  it("ranks expected chunks for IIS hardening queries", async () => {
    const iisText = await readFile("data/fixtures/knowledge/iis-hardening-runbook.md", "utf8");
    const loggingText = await readFile("data/fixtures/knowledge/windows-logging-baseline.md", "utf8");
    const iisSource = source({ id: "source_iis", title: "IIS Hardening Runbook" });
    const loggingSource = source({ id: "source_logging", title: "Windows Logging Baseline" });
    const chunks = [
      ...chunkKnowledgeDocument({ sourceId: iisSource.id, title: iisSource.title, text: iisText, type: "markdown" }),
      ...chunkKnowledgeDocument({ sourceId: loggingSource.id, title: loggingSource.title, text: loggingText, type: "markdown" })
    ];

    const results = retrieveKnowledge({
      query: {
        query: "How do I harden IIS TLS and application pools?",
        limit: 3
      },
      sources: [iisSource, loggingSource],
      chunks
    });

    expect(results[0].citation.title).toBe("IIS Hardening Runbook");
    expect(results[0].excerpt.toLowerCase()).toMatch(/iis|tls|application/);
  });

  it("flags stale sources based on review date", () => {
    const staleSource = source({ reviewAt: "2024-01-01T00:00:00.000Z" });
    const currentSource = source({ reviewAt: "2027-01-01T00:00:00.000Z" });
    const now = new Date("2026-04-16T00:00:00.000Z");

    expect(isKnowledgeSourceStale(staleSource, now)).toBe(true);
    expect(isKnowledgeSourceStale(currentSource, now)).toBe(false);
  });
});
