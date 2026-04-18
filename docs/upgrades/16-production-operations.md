# 16 - Production Operations

## Purpose

Add the operational foundation needed to deploy, monitor, recover, scale, and maintain the platform.

## Current Gap

The MVP has local dev and CI docs, but lacks deployment manifests, container images, backup and restore procedures, dashboards, alerting, queue workers, capacity guidance, and disaster recovery runbooks.

## Target Operator Outcome

An operator can deploy the platform from documented manifests, monitor health and dependencies, run backups, restore a test environment, and respond to common incidents with runbooks.

## Safety Boundary

- Production operations must protect evidence, secrets, audit logs, and tenant boundaries.
- Debug modes must not expose sensitive data.
- Observability data must be sanitized.
- Backups and exports must follow retention and access policies.

## Proposed Architecture

- Container images for API, web, workers, and future migrations.
- Compose stack for local production-like validation.
- Kubernetes or Helm manifests for production deployment.
- Config loader separates environment-specific settings from secrets.
- Worker process handles ingestion, evals, and scheduled jobs.
- Observability bundle includes metrics, logs, traces, dashboards, and alert rules.
- Backup/restore tooling supports database, object store, and audit evidence.

## Expected File Changes

New files:

- `Dockerfile.api`
- `Dockerfile.web`
- `Dockerfile.worker`
- `docker-compose.yml`
- `deploy/kubernetes/api-deployment.yaml`
- `deploy/kubernetes/web-deployment.yaml`
- `deploy/kubernetes/worker-deployment.yaml`
- `deploy/kubernetes/configmap.yaml`
- `deploy/kubernetes/secrets.example.yaml`
- `deploy/kubernetes/ingress.yaml`
- `deploy/observability/dashboards/api-health.json`
- `deploy/observability/alerts/platform-alerts.yaml`
- `scripts/backup.ts`
- `scripts/restore.ts`
- `scripts/smoke-production.ts`
- `docs/runbooks/backup-restore.md`
- `docs/runbooks/platform-incident-response.md`
- `docs/admin-guide/production-deployment.md`
- `tests/integration/production-smoke.test.ts`

Existing files to modify:

- `package.json`: add build image, smoke, backup, restore scripts.
- `apps/api/src/server.ts`: add graceful shutdown and readiness handling.
- `apps/api/src/routes/health.ts`: add readiness and liveness endpoints.
- `apps/api/src/observability/health-service.ts`: include worker, storage, provider, connector checks.
- `apps/api/src/observability/metrics-service.ts`: expose production metrics.
- `apps/api/src/utils/files.ts`: support environment-aware data paths.
- `.github/workflows/ci.yml`: optionally build containers and run production smoke checks.
- `docs/getting-started/local-dev.md`: link to production deployment docs.

## Data Model Additions

- `OperationalCheck`: component, status, latency, checkedAt, details.
- `BackupManifest`: backup id, components, hashes, createdAt, retention class.
- `RestoreRun`: backup id, status, startedAt, completedAt, validation results.

## API Changes

- `GET /health/live`
- `GET /health/ready`
- `GET /health/dependencies` may include worker, storage, provider, connector, and queue readiness.

## UI Changes

- Admin operations dashboard.
- Health and dependency status cards.
- Backup and restore status if administrative UI is implemented.

## Milestones

- [ ] Add Dockerfiles and Compose stack.
- [ ] Add production config examples without secrets.
- [ ] Add health, readiness, and liveness probes.
- [ ] Add worker process and scheduled job pattern.
- [ ] Add backup and restore docs.
- [ ] Add metrics dashboard definitions.
- [ ] Add alerting rules and disaster recovery runbook.

## Acceptance Criteria

- A clean environment can run the platform from documented steps.
- Operators can monitor health and dependencies.
- Backups can be restored in a test environment.
- Incidents have runbooks.
- No production docs require committing secrets.

## Test Plan

- Build tests for container images.
- Smoke tests for Compose or Kubernetes deployment.
- Backup/restore rehearsal tests.
- Health endpoint tests for live, ready, and degraded states.

## Rollout Notes

Complete scalable storage first if production deployment needs database-backed persistence.
