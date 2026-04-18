import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-knowledge-governance-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("knowledge governance flow", () => {
  it("governs approval, tenant isolation, freshness, taxonomy, and citation quality", async () => {
    const fastify = await createTestApp();
    const windowsBaseline = await readFile("data/fixtures/knowledge/windows-logging-baseline.md", "utf8");
    const tenantRunbook = await readFile("data/fixtures/knowledge/tenant-specific-runbook.md", "utf8");

    const defaultIngest = await fastify.inject({
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
        taxonomyTags: ["T1110", "D3-ACH"],
        version: "2026.1",
        reviewAt: "2027-01-01T00:00:00.000Z"
      }
    });
    const partnerIngest = await fastify.inject({
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
        taxonomyTags: ["T1110", "D3-ACH"],
        version: "2026.1",
        reviewAt: "2027-03-01T00:00:00.000Z"
      }
    });

    expect(defaultIngest.statusCode).toBe(200);
    expect(partnerIngest.statusCode).toBe(200);
    const defaultSource = defaultIngest.json().source;
    const partnerSource = partnerIngest.json().source;

    const registryResponse = await fastify.inject({
      method: "GET",
      url: "/knowledge/source-records"
    });
    expect(registryResponse.statusCode).toBe(200);
    expect(registryResponse.json().sourceRecords.map((record: { tenantId: string }) => record.tenantId)).toEqual(
      expect.arrayContaining(["tenant_default", "tenant_partner"])
    );

    const hiddenPartnerSearch = await fastify.inject({
      method: "POST",
      url: "/knowledge/search/hybrid",
      payload: {
        query: "service principals unusual geo patterns",
        limit: 3,
        filters: { tenantId: "tenant_default" }
      }
    });
    expect(hiddenPartnerSearch.statusCode).toBe(200);
    expect(hiddenPartnerSearch.json().results).toHaveLength(0);

    const partnerSearch = await fastify.inject({
      method: "POST",
      url: "/knowledge/search/hybrid",
      payload: {
        query: "service principals unusual geo patterns",
        limit: 3,
        filters: { tenantId: "tenant_partner" }
      }
    });
    expect(partnerSearch.statusCode).toBe(200);
    expect(partnerSearch.json().results[0].citation.sourceId).toBe(partnerSource.id);

    const defaultSearch = await fastify.inject({
      method: "POST",
      url: "/knowledge/search/hybrid",
      payload: {
        query: "failed logons authentication telemetry",
        limit: 2,
        filters: { tenantId: "tenant_default" }
      }
    });
    expect(defaultSearch.statusCode).toBe(200);
    const [defaultResult] = defaultSearch.json().results;
    expect(defaultResult.citation.sourceId).toBe(defaultSource.id);
    expect(defaultResult.citationQuality.trust).toBeGreaterThan(0.9);

    const qualityResponse = await fastify.inject({
      method: "GET",
      url: `/knowledge/citations/${defaultResult.chunkId}/quality`
    });
    expect(qualityResponse.statusCode).toBe(200);
    expect(qualityResponse.json().citationQuality.sourceId).toBe(defaultSource.id);

    const freshnessResponse = await fastify.inject({
      method: "GET",
      url: `/knowledge/sources/${defaultSource.id}/freshness`
    });
    expect(freshnessResponse.statusCode).toBe(200);
    expect(freshnessResponse.json().freshness.stale).toBe(false);

    const taxonomyResponse = await fastify.inject({
      method: "GET",
      url: `/knowledge/sources/${defaultSource.id}/taxonomy`
    });
    expect(taxonomyResponse.statusCode).toBe(200);
    expect(taxonomyResponse.json().mappings.map((mapping: { framework: string }) => mapping.framework)).toEqual(
      expect.arrayContaining(["ATTACK", "D3FEND"])
    );

    const retiredResponse = await fastify.inject({
      method: "PATCH",
      url: `/knowledge/sources/${defaultSource.id}/approval`,
      payload: {
        reviewer: "security-lead",
        status: "retired",
        reason: "Superseded during governance test."
      }
    });
    expect(retiredResponse.statusCode).toBe(200);
    expect(retiredResponse.json().source.approvalState).toBe("retired");

    const approvalsResponse = await fastify.inject({
      method: "GET",
      url: `/knowledge/sources/${defaultSource.id}/approvals`
    });
    expect(approvalsResponse.statusCode).toBe(200);
    expect(approvalsResponse.json().approvals).toHaveLength(1);

    const retiredSearch = await fastify.inject({
      method: "POST",
      url: "/knowledge/search/hybrid",
      payload: {
        query: "failed logons authentication telemetry",
        limit: 2,
        filters: { tenantId: "tenant_default" }
      }
    });
    expect(retiredSearch.statusCode).toBe(200);
    expect(retiredSearch.json().results).toHaveLength(0);

    const unsafeIngest = await fastify.inject({
      method: "POST",
      url: "/knowledge/sources",
      payload: {
        title: "Unsafe Placeholder",
        text: "Credential theft notes are blocked from the curated knowledge base.",
        uri: "local://knowledge/unsafe",
        type: "markdown",
        trustTier: "internal",
        owner: "security-platform",
        tenantId: "tenant_default",
        approvalState: "approved",
        version: "1"
      }
    });
    expect(unsafeIngest.statusCode).toBe(200);
    expect(unsafeIngest.json().source.approvalState).toBe("quarantined");

    const unsafeApproval = await fastify.inject({
      method: "PATCH",
      url: `/knowledge/sources/${unsafeIngest.json().source.id}/approval`,
      payload: {
        reviewer: "security-lead",
        status: "approved",
        reason: "Attempted approval should stay quarantined."
      }
    });
    expect(unsafeApproval.statusCode).toBe(200);
    expect(unsafeApproval.json().source.approvalState).toBe("quarantined");
  });
});
