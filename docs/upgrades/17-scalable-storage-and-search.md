# 17 - Scalable Storage And Search

## Purpose

Replace local JSON persistence with durable storage, artifact handling, search, retrieval indexes, retention lifecycle, and tenant-aware access controls.

## Current Gap

The MVP uses local JSON storage, which is useful for tests but not enough for real cases, large evidence sets, search, retention, migrations, or tenant isolation.

## Target Operator Outcome

Cases, evidence, audit records, reports, and artifacts persist durably; analysts can search with permissions; admins can manage retention; and large evidence artifacts are stored outside case JSON.

## Safety Boundary

- Storage must enforce access control, tenant boundaries, retention, redaction, and encryption policies.
- Sensitive evidence must not leak through search, retrieval, exports, logs, or model prompts.
- Deletion and retention actions must be auditable.

## Proposed Architecture

- Storage abstraction v2 supports repositories for cases, evidence, audits, jobs, knowledge, and reports.
- Relational database stores metadata, cases, permissions, jobs, and references.
- Object storage stores large artifacts and raw evidence.
- Search backend indexes authorized case, event, entity, indicator, and report data.
- Hybrid retrieval index supports knowledge and evidence retrieval with policy filters.
- Migration runner handles schema upgrades and rollbacks.
- Retention worker deletes or archives records according to policy.

## Expected File Changes

New files:

- `apps/api/src/storage/v2/storage-context.ts`
- `apps/api/src/storage/v2/case-repository.ts`
- `apps/api/src/storage/v2/evidence-repository.ts`
- `apps/api/src/storage/v2/audit-repository.ts`
- `apps/api/src/storage/v2/object-storage-adapter.ts`
- `apps/api/src/storage/v2/postgres-storage-adapter.ts`
- `apps/api/src/storage/v2/search-index-adapter.ts`
- `apps/api/src/storage/v2/retention-worker.ts`
- `apps/api/src/storage/v2/migration-runner.ts`
- `apps/api/src/schemas/storage-v2.schema.ts`
- `migrations/0001_initial.sql`
- `migrations/0002_evidence_artifacts.sql`
- `scripts/migrate.ts`
- `scripts/storage-smoke.ts`
- `tests/unit/storage-v2-repositories.test.ts`
- `tests/integration/storage-v2-flow.test.ts`
- `tests/integration/storage-migration-flow.test.ts`
- `docs/admin-guide/storage-and-search.md`

Existing files to modify:

- `apps/api/src/storage/storage-adapter.ts`: define v2 adapter compatibility boundary.
- `apps/api/src/storage/local/local-storage-adapter.ts`: keep as test adapter.
- `apps/api/src/services/case-service.ts`: use repository abstraction.
- `apps/api/src/audit/audit-event-service.ts`: use audit repository.
- `apps/api/src/knowledge/ingest-service.ts`: use retrieval index abstraction.
- `apps/api/src/search/search-index.ts`: delegate to search backend adapter.
- `apps/api/src/jobs/job-queue.ts`: support durable queue state if needed.
- `apps/api/src/utils/files.ts`: separate artifact paths from metadata storage.
- `package.json`: add migration and storage smoke scripts.
- `docs/api/openapi.yaml`: document pagination and search changes.

## Data Model Additions

- `CaseRecord`: tenant id, status, owner, severity, timestamps, metadata.
- `EvidenceArtifact`: id, case id, source id, object ref, hash, classification, retention.
- `SearchDocument`: resource id, type, tenant id, fields, permissions, indexedAt.
- `MigrationRecord`: version, checksum, appliedAt, status.
- `RetentionPolicy`: resource type, tenant id, duration, action, legal hold flag.

## API Changes

- Add pagination, filtering, and sorting to case, search, and evidence routes.
- `GET /storage/health`
- `POST /admin/storage/retention-runs`
- `GET /admin/storage/migrations`

## UI Changes

- Paginated case and evidence lists.
- Search filters with permission-aware result counts.
- Admin storage health, migrations, and retention status.

## Milestones

- [ ] Add storage abstraction v2.
- [ ] Add relational schema and migrations.
- [ ] Add object storage adapter.
- [ ] Add search index adapter.
- [ ] Add vector or hybrid retrieval index.
- [ ] Add retention and deletion jobs.
- [ ] Add export/import tooling.

## Acceptance Criteria

- Cases and evidence persist durably.
- Search supports pagination and access control.
- Large artifacts do not live in JSON records.
- Retention jobs are auditable.
- Migration and rollback paths are tested.

## Test Plan

- Unit tests for repository logic and retention decisions.
- Integration tests against local database and search services.
- Migration and rollback tests.
- Security tests for tenant-isolated search results.

## Rollout Notes

Introduce the v2 adapter behind existing services before removing local JSON. Keep local JSON available for lightweight tests.
