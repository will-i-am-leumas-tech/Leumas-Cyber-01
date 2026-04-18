# 04 - Live Evidence Ingestion

## Purpose

Add durable ingestion pipelines for logs, alerts, cloud events, endpoint events, identity events, network evidence, and analyst-uploaded artifacts.

## Current Gap

The MVP handles fixtures and uploads, but it does not support scheduled ingestion, streaming or batched sources, large datasets, deduplication, chain-of-custody metadata, or source reliability scoring.

## Target Operator Outcome

An operator can register an evidence source, run or schedule ingestion, track ingestion jobs, link normalized evidence to cases, and trust that privacy handling occurs before model prompt packaging.

## Safety Boundary

- Raw evidence must not be sent directly to models.
- Redaction and classification run before prompt packaging.
- Source credentials and secrets are never stored in case summaries.
- Retention and deletion rules must be explicit.

## Proposed Architecture

- Source registry defines evidence source type, owner, reliability, retention, parser, and connector.
- Ingestion job queue processes large imports outside request threads.
- Parser registry normalizes events into common entities, timelines, indicators, and raw artifact refs.
- Deduplication service fingerprints events and artifacts.
- Chain-of-custody service records source, hash, retrieval time, actor, and transformation history.
- Evidence search service indexes normalized evidence and case links.

## Expected File Changes

New files:

- `apps/api/src/ingestion/evidence-source-registry.ts`
- `apps/api/src/ingestion/ingestion-job-service.ts`
- `apps/api/src/ingestion/ingestion-worker.ts`
- `apps/api/src/ingestion/deduplication-service.ts`
- `apps/api/src/ingestion/chain-of-custody-service.ts`
- `apps/api/src/ingestion/source-reliability-service.ts`
- `apps/api/src/ingestion/parsers/dns-parser.ts`
- `apps/api/src/ingestion/parsers/proxy-parser.ts`
- `apps/api/src/ingestion/parsers/email-security-parser.ts`
- `apps/api/src/schemas/ingestion.schema.ts`
- `apps/api/src/routes/ingestion.ts`
- `data/fixtures/ingestion/dns-events.log`
- `data/fixtures/ingestion/proxy-events.log`
- `data/fixtures/ingestion/email-security-alert.json`
- `tests/unit/evidence-ingestion-service.test.ts`
- `tests/integration/live-ingestion-flow.test.ts`
- `docs/admin-guide/evidence-ingestion.md`

Existing files to modify:

- `apps/api/src/ingest/parser-registry.ts`: register new parser families.
- `apps/api/src/ingest/event-normalizer.ts`: support source and custody metadata.
- `apps/api/src/jobs/job-queue.ts`: add ingestion job type and progress.
- `apps/api/src/routes/jobs.ts`: expose ingestion job status.
- `apps/api/src/schemas/case.schema.ts`: store evidence refs and custody entries.
- `apps/api/src/search/search-index.ts`: index evidence records.
- `apps/api/src/privacy/sensitive-data-detector.ts`: classify ingested evidence.
- `apps/api/src/privacy/prompt-minimizer.ts`: build minimized evidence packages.
- `docs/api/openapi.yaml`: document ingestion source and job endpoints.

## Data Model Additions

- `EvidenceSource`: id, type, owner, retention class, reliability score, parser id.
- `IngestionJob`: id, source id, status, counters, errors, startedAt, completedAt.
- `EvidenceRecord`: id, source id, normalized event, raw artifact ref, hash, classification.
- `ChainOfCustodyEntry`: evidence id, actor, operation, timestamp, input hash, output hash.
- `DeduplicationRecord`: fingerprint, firstSeen, lastSeen, source ids, duplicate count.

## API Changes

- `POST /ingestion/sources`: register an evidence source.
- `GET /ingestion/sources`: list sources.
- `POST /ingestion/jobs`: start ingestion.
- `GET /ingestion/jobs/:id`: get status and errors.
- `POST /cases/:id/evidence/import`: link ingested evidence to a case.

## UI Changes

- Admin source registry page.
- Ingestion job progress and error view.
- Case evidence browser with source, custody, and classification metadata.

## Milestones

- [x] Add ingestion source schema and source registry.
- [x] Add ingestion jobs and queue worker.
- [x] Add parser coverage for DNS, proxy, and email security events.
- [ ] Add parser coverage for SIEM, EDR, identity, and cloud events.
- [x] Add deduplication and event fingerprinting.
- [x] Add chain-of-custody metadata.
- [x] Add evidence search and case-linking APIs.
- [x] Add retention and redaction hooks.

## Acceptance Criteria

- Large evidence batches ingest without blocking request threads.
- Duplicate events are recognized.
- Evidence source, hash, and ingestion time are preserved.
- Model prompts receive minimized evidence packages.
- Ingestion failures are visible and recoverable.

## Test Plan

- Unit tests for parsers, fingerprints, source reliability, and chain-of-custody.
- Integration tests for queued ingestion, job status, case linkage, and search.
- Privacy tests for redaction and classification before prompt packaging.

## Rollout Notes

Start with batch ingestion and deterministic fixtures. Add streaming only after storage and queue infrastructure are stable.

## MVP Implementation Notes

- Added `EvidenceSource`, `IngestionJob`, `EvidenceRecord`, `ChainOfCustodyEntry`, and `DeduplicationRecord` schemas in `apps/api/src/schemas/ingestion.schema.ts`.
- Added an in-memory source registry and synchronous job service for deterministic fixture-backed ingestion.
- Added DNS, proxy, and email security parser families with normalized event output.
- Added privacy classification through the sensitive data detector and stored finding ids on evidence records.
- Added `POST /ingestion/sources`, `GET /ingestion/sources`, `POST /ingestion/jobs`, `GET /ingestion/jobs/:id`, and `POST /cases/:id/evidence/import`.
- Added case storage for evidence records, chain of custody entries, and deduplication records.
- Added admin docs and tests for source registration, parsing, deduplication, custody, job status, and case linkage.

Remaining work for a production version is durable queue/storage, streaming ingestion, SIEM/EDR/identity/cloud parser parity, retention enforcement, and large batch backpressure.
