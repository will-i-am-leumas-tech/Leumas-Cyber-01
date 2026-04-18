# 20 - Storage And Scalability

## Purpose

Replace local JSON storage with durable, queryable, scalable storage for cases, events, artifacts, audit logs, jobs, and reports.

## Target Capability

- Use a production-ready database.
- Store large artifacts separately.
- Add migrations.
- Add search.
- Add background jobs.
- Support backup and restore.

## Current State

- Implemented in the MVP on 2026-04-17.
- Cases, audit events, and artifacts now have repository interfaces with local JSON adapter implementations.
- Search and job routes are available for local-first development.
- JSON-to-repository migration and repeatable repository contract tests are in place.
- SQLite/PostgreSQL remain future adapters; local JSON is retained as the tested development adapter.

## Scope

- Storage adapter interface.
- SQLite or PostgreSQL schema path.
- Migration runner.
- Object storage abstraction.
- Job queue scaffold.

## Non-Goals

- No multi-region architecture in first scaffold.
- No distributed search cluster in first scaffold.
- No removal of local JSON until migration path is tested.

## Proposed Architecture

- `CaseRepository`: CRUD and list queries.
- `AuditRepository`: append and query audit events.
- `ArtifactRepository`: metadata and object storage refs.
- `JobQueue`: enqueue, claim, complete, retry.
- `MigrationRunner`: versioned schema changes.

Suggested modules:

- `apps/api/src/storage/storage-adapter.ts`
- `apps/api/src/storage/sqlite/*.repository.ts`
- `apps/api/src/storage/migrations/*.ts`
- `apps/api/src/jobs/job-queue.ts`
- `apps/api/src/search/search-index.ts`

## Data Model

Core tables:

- `cases`
- `audit_events`
- `artifacts`
- `normalized_events`
- `entities`
- `jobs`
- `reports`

## API Changes

No required API changes for first migration. Routes should use repositories instead of file services.

Later:

- `GET /search`
- `GET /jobs/:id`
- `POST /admin/backup`

## UI Changes

- Search bar.
- Job status indicators.
- Storage health status for admins.

## Scaffold Steps

1. Define repository interfaces matching current case and audit services.
2. Add SQLite adapter for local-first durability.
3. Add migrations.
4. Add JSON-to-SQL migration script.
5. Move case routes to repository interface.
6. Add search index for case title, summary, indicators, and entities.

## Test Plan

- Unit: repository contract tests run against in-memory SQLite.
- Integration: `/analyze` persists case through repository adapter.
- Integration: JSON-to-SQL migration imports existing cases.
- Reliability: job retry state transitions work.
- Regression: local JSON adapter can still run in dev if retained.

## Fixtures

- `data/fixtures/storage/sample-case.json`
- `data/fixtures/storage/sample-audit.jsonl`
- `data/fixtures/storage/migration-input/`

## Acceptance Criteria

- Case and audit storage can run through repository interfaces.
- SQLite adapter passes repository contract tests.
- Migrations are versioned and repeatable.
- Existing local data can be migrated.
- Search returns expected fixture cases.

## MVP Verification

- `npm test -- tests/unit/storage-service.test.ts tests/integration/storage-flow.test.ts`: 2 files, 4 tests passed.
- `npm run typecheck`: API and web TypeScript passed.
- `npm run evals`: 6/6 eval cases passed with average score 1.000; scorecard written to `tmp/eval-scorecard.json`.
- `npm test`: 47 files, 104 tests passed.
- `npm run build`: API TypeScript and web production build passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
