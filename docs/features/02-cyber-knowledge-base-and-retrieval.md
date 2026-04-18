# 02 - Cyber Knowledge Base And Retrieval

## Purpose

Add source-grounded retrieval so the agent can use internal runbooks, standards, vendor documentation, and curated threat knowledge without relying only on model memory.

## Target Capability

- Ingest trusted security documents.
- Retrieve relevant guidance during analysis.
- Cite source documents and versions.
- Distinguish internal policy from external references.
- Warn when retrieved sources are stale or low-trust.

## Current State

- No retrieval layer exists.
- Hardening guidance is static code.
- Reports do not cite external or internal sources.

## Scope

- Local document ingestion.
- Chunking, metadata extraction, and embedding or keyword search adapter.
- Retrieval snapshots stored in case audit records.
- Source trust tiers and stale-source metadata.

## Non-Goals

- No live web browsing by default.
- No unsourced claims presented as policy.
- No retrieval of secrets or restricted documents into model prompts without redaction and access checks.

## Proposed Architecture

- `KnowledgeSource`: document identity, owner, trust tier, version, review date.
- `KnowledgeChunk`: chunk text, source ID, location, hash, tags.
- `RetrievalQuery`: task, normalized query, filters, requesting case ID.
- `RetrievalResult`: chunk ID, score, source metadata, excerpt, citation.
- `RetrievalSnapshot`: immutable record of documents used for a case response.

Suggested modules:

- `apps/api/src/knowledge/ingest-service.ts`
- `apps/api/src/knowledge/chunker.ts`
- `apps/api/src/knowledge/retriever.ts`
- `apps/api/src/knowledge/citation-service.ts`
- `apps/api/src/knowledge/source-policy.ts`

## Data Model

Add storage for:

- Sources: id, title, uri, type, trustTier, owner, version, reviewAt, hash.
- Chunks: id, sourceId, text, location, tags, embeddingRef or searchText.
- Retrieval snapshots: caseId, query, resultChunkIds, timestamp, promptIncluded.

## API Changes

- `POST /knowledge/sources` to ingest a document.
- `GET /knowledge/sources` to list sources.
- `POST /knowledge/search` for retrieval testing.
- Extend `/analyze` with `useKnowledge: boolean` and `knowledgeFilters`.

## UI Changes

- Knowledge source admin page.
- Citation drawer in reports.
- Stale-source warning banner.
- Trust tier labels on cited content.

## Scaffold Steps

1. Add schemas for sources, chunks, and retrieval results.
2. Build Markdown and plain-text ingestion first.
3. Add deterministic keyword retriever before embeddings.
4. Store retrieval snapshots with cases.
5. Update hardening adapter to retrieve relevant guidance.
6. Add citations to reports.

## Test Plan

- Unit: chunker preserves source location metadata.
- Unit: retriever ranks expected chunks for hardening queries.
- Unit: stale-source detector flags expired review dates.
- Integration: ingest source, search it, analyze with citation.
- Safety: redaction runs before chunks are sent to model provider.

## Fixtures

- `data/fixtures/knowledge/windows-logging-baseline.md`
- `data/fixtures/knowledge/iis-hardening-runbook.md`
- `data/fixtures/knowledge/stale-source.md`

## Acceptance Criteria

- Analyst can ingest and retrieve a local Markdown runbook.
- Analysis output cites source title and location.
- Retrieval snapshots are stored with the case.
- Stale sources are visible to the analyst.
- Tests prove retrieval is deterministic for fixtures.

