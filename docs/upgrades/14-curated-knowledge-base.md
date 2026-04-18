# 14 - Curated Knowledge Base

## Purpose

Build a trustworthy cyber knowledge base with curated sources, freshness checks, citations, taxonomy mappings, approval workflows, and tenant isolation.

## Current Gap

The MVP has local retrieval and citation support, but lacks source governance, hybrid search, freshness scoring, retrieval quality evaluation, and approval or retirement workflows.

## Target Operator Outcome

Analysts receive answers grounded in approved, current, tenant-appropriate knowledge, with citations and warnings when sources are stale, low trust, or insufficient.

## Safety Boundary

- Knowledge should support defensive understanding, detection, remediation, and authorized validation.
- Do not ingest or surface instructions that enable malware, credential theft, stealth, persistence, evasion, or unauthorized compromise.
- Tenant-specific knowledge must not leak across tenants.

## Proposed Architecture

- Knowledge source registry stores owner, trust, freshness, tenant scope, taxonomy tags, and approval state.
- Ingestion pipeline chunks, classifies, embeds, indexes, and cites documents.
- Hybrid retriever combines keyword, metadata, semantic similarity, and source policy.
- Citation quality scorer checks citation relevance and freshness.
- Taxonomy mapper links docs to ATT&CK, D3FEND, CAPEC, CWE, CVE, and vendor advisories.
- Approval workflow governs new, updated, stale, and retired sources.

## Expected File Changes

New files:

- `apps/api/src/knowledge/source-registry.ts`
- `apps/api/src/knowledge/source-freshness-service.ts`
- `apps/api/src/knowledge/hybrid-retriever.ts`
- `apps/api/src/knowledge/citation-quality-scorer.ts`
- `apps/api/src/knowledge/taxonomy-mapper.ts`
- `apps/api/src/knowledge/knowledge-approval-service.ts`
- `apps/api/src/knowledge/tenant-knowledge-policy.ts`
- `apps/api/src/schemas/knowledge-v2.schema.ts`
- `data/fixtures/knowledge/approved-source-record.json`
- `data/fixtures/knowledge/stale-vendor-advisory.md`
- `data/fixtures/knowledge/tenant-specific-runbook.md`
- `tests/unit/curated-knowledge-base.test.ts`
- `tests/integration/knowledge-governance-flow.test.ts`
- `tests/evals/knowledge-grounding.test.ts`
- `docs/admin-guide/knowledge-governance.md`

Existing files to modify:

- `apps/api/src/knowledge/ingest-service.ts`: include approval, tenant, taxonomy, and freshness metadata.
- `apps/api/src/knowledge/retriever.ts`: delegate to hybrid retriever.
- `apps/api/src/knowledge/source-policy.ts`: enforce trust, freshness, and tenant scope.
- `apps/api/src/knowledge/citation-service.ts`: include citation quality status.
- `apps/api/src/knowledge/chunker.ts`: preserve citation anchors and section metadata.
- `apps/api/src/routes/knowledge.ts`: add source registry, approval, and quality endpoints.
- `apps/api/src/pipeline/analyze-pipeline.ts`: pass citation quality and stale-source warnings to output.
- `apps/api/src/schemas/case.schema.ts`: store cited source quality and warnings.
- `docs/api/openapi.yaml`: document knowledge governance endpoints.

## Data Model Additions

- `KnowledgeSource`: id, owner, tenant id, trust level, freshness date, approval state, taxonomy tags.
- `KnowledgeChunkV2`: chunk id, source id, section, text, embedding ref, citation anchor, classification.
- `CitationQuality`: citation id, relevance, freshness, trust, warnings.
- `KnowledgeApproval`: source id, reviewer, status, reason, timestamp.
- `TaxonomyMapping`: source or chunk id, framework, object id, confidence.

## API Changes

- `POST /knowledge/sources`
- `PATCH /knowledge/sources/:id/approval`
- `GET /knowledge/sources/:id/freshness`
- `POST /knowledge/search/hybrid`
- `GET /knowledge/citations/:id/quality`

## UI Changes

- Knowledge source registry and approval queue.
- Citation quality warnings in case output.
- Tenant-scoped knowledge filter.
- Stale-source review dashboard.

## Milestones

- [x] Add source registry with owner, freshness, and trust metadata.
- [x] Add hybrid search.
- [x] Add citation quality scoring.
- [x] Add stale-source warnings.
- [x] Add approval workflow for new knowledge.
- [x] Add tenant isolation for knowledge collections.
- [x] Add taxonomy mappings.

## Acceptance Criteria

- Answers cite approved sources.
- Stale or low-trust sources are flagged.
- Tenant knowledge does not leak across tenants.
- Retrieval quality is evaluated.
- Unsafe knowledge content is blocked or quarantined.

## Test Plan

- Unit tests for source policy, freshness scoring, citation quality, and taxonomy mapping.
- Integration tests for ingestion, approval, retrieval, and citations.
- Eval tests for grounded answers, stale-source handling, and tenant isolation.

## Rollout Notes

Start with metadata and policy over the existing local knowledge store before adding external knowledge feeds.
