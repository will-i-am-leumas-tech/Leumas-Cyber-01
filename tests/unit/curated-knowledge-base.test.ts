import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { chunkKnowledgeDocument } from "../../apps/api/src/knowledge/chunker";
import { hybridRetrieveKnowledge } from "../../apps/api/src/knowledge/hybrid-retriever";
import { KnowledgeService } from "../../apps/api/src/knowledge/ingest-service";
import { freshnessStatus } from "../../apps/api/src/knowledge/source-freshness-service";
import { mapKnowledgeTaxonomy } from "../../apps/api/src/knowledge/taxonomy-mapper";
import type { KnowledgeSource } from "../../apps/api/src/schemas/knowledge.schema";
import type { CitationQuality } from "../../apps/api/src/schemas/knowledge-v2.schema";
import { sha256Text } from "../../apps/api/src/reasoning/hash";

function source(overrides: Partial<KnowledgeSource>): KnowledgeSource {
  return {
    id: overrides.id ?? "source_test",
    title: overrides.title ?? "Test Source",
    uri: overrides.uri ?? "local://test",
    type: overrides.type ?? "markdown",
    trustTier: overrides.trustTier ?? "internal",
    owner: overrides.owner ?? "security-platform",
    tenantId: overrides.tenantId ?? "tenant_default",
    approvalState: overrides.approvalState ?? "approved",
    taxonomyTags: overrides.taxonomyTags ?? [],
    version: overrides.version ?? "1",
    reviewAt: overrides.reviewAt,
    createdAt: "2026-04-18T00:00:00.000Z",
    hash: overrides.hash ?? sha256Text("test")
  };
}

describe("curated knowledge base", () => {
  it("filters hybrid retrieval by tenant and approval state", () => {
    const defaultSource = source({ id: "source_default", title: "Default Identity Baseline" });
    const partnerSource = source({
      id: "source_partner",
      title: "Partner Identity Baseline",
      tenantId: "tenant_partner"
    });
    const draftSource = source({
      id: "source_draft",
      title: "Draft Identity Notes",
      approvalState: "draft"
    });
    const sources = [defaultSource, partnerSource, draftSource];
    const textBySource = new Map([
      [defaultSource.id, "Monitor failed login bursts and MFA changes for ATTACK T1110 coverage."],
      [partnerSource.id, "Partner-only monitoring for failed login bursts and conditional access."],
      [draftSource.id, "Draft monitoring guidance for failed login bursts."]
    ]);
    const chunks = sources.flatMap((item) =>
      chunkKnowledgeDocument({
        sourceId: item.id,
        title: item.title,
        text: textBySource.get(item.id) ?? "",
        type: "markdown"
      })
    );

    const defaultResults = hybridRetrieveKnowledge({
      query: {
        query: "failed login monitoring",
        limit: 5,
        filters: { tenantId: "tenant_default" }
      },
      sources,
      chunks,
      now: new Date("2026-04-18T00:00:00.000Z")
    });
    const defaultTitles = defaultResults.map((result) => result.citation.title);

    expect(defaultTitles).toContain("Default Identity Baseline");
    expect(defaultTitles).not.toContain("Partner Identity Baseline");
    expect(defaultTitles).not.toContain("Draft Identity Notes");

    const partnerResults = hybridRetrieveKnowledge({
      query: {
        query: "failed login monitoring",
        limit: 5,
        filters: { tenantId: "tenant_partner" }
      },
      sources,
      chunks,
      now: new Date("2026-04-18T00:00:00.000Z")
    });

    expect(partnerResults.map((result) => result.citation.title)).toContain("Partner Identity Baseline");
  });

  it("scores stale and lower-trust citations with analyst warnings", () => {
    const staleSource = source({
      id: "source_stale_vendor",
      title: "Stale Vendor Advisory",
      trustTier: "community",
      reviewAt: "2024-01-01T00:00:00.000Z"
    });
    const chunks = chunkKnowledgeDocument({
      sourceId: staleSource.id,
      title: staleSource.title,
      text: "Review failed login monitoring and validate every setting against the current baseline.",
      type: "markdown"
    });

    const [result] = hybridRetrieveKnowledge({
      query: { query: "failed login monitoring", limit: 1 },
      sources: [staleSource],
      chunks,
      now: new Date("2026-04-18T00:00:00.000Z")
    });
    const quality = result.citationQuality as CitationQuality;

    expect(freshnessStatus(staleSource, new Date("2026-04-18T00:00:00.000Z")).stale).toBe(true);
    expect(quality.warnings.join(" ")).toContain("past its review date");
    expect(quality.warnings.join(" ")).toContain("lower trust tier community");
  });

  it("maps source and chunk text to defensive cyber taxonomies", () => {
    const mappedSource = source({
      id: "source_taxonomy",
      title: "Taxonomy Baseline",
      taxonomyTags: ["T1110", "CVE-2026-12345", "CWE-287", "CAPEC-112", "D3-ACH"]
    });
    const chunks = chunkKnowledgeDocument({
      sourceId: mappedSource.id,
      title: mappedSource.title,
      text: "Investigate ATTACK T1110 and D3-ACH coverage for authentication controls.",
      type: "markdown"
    });
    const mappings = [...mapKnowledgeTaxonomy(mappedSource), ...chunks.flatMap(mapKnowledgeTaxonomy)];

    expect(mappings.map((mapping) => mapping.framework)).toEqual(
      expect.arrayContaining(["ATTACK", "CVE", "CWE", "CAPEC", "D3FEND"])
    );
  });

  it("quarantines unsafe source text and preserves approval history", async () => {
    const service = new KnowledgeService(await mkdtemp(path.join(os.tmpdir(), "leumas-knowledge-unit-")));
    const { source: quarantinedSource } = await service.ingestSource({
      title: "Unsafe Source",
      text: "Credential theft procedure placeholder that must never be retrieved.",
      uri: "local://knowledge/unsafe",
      type: "markdown",
      trustTier: "internal",
      owner: "security-platform",
      tenantId: "tenant_default",
      approvalState: "approved",
      version: "1",
      reviewAt: "2027-01-01T00:00:00.000Z"
    });

    expect(quarantinedSource.approvalState).toBe("quarantined");
    await expect(service.search({ query: "credential theft", limit: 3 })).resolves.toHaveLength(0);

    const review = await service.updateSourceApproval(quarantinedSource.id, {
      reviewer: "security-lead",
      status: "approved",
      reason: "Attempted approval during review."
    });

    expect(review?.source.approvalState).toBe("quarantined");
    expect(await service.listApprovals(quarantinedSource.id)).toHaveLength(1);
    expect((await service.listApprovals(quarantinedSource.id))[0].status).toBe("quarantined");
  });
});
