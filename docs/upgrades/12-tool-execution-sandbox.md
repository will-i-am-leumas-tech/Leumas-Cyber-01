# 12 - Tool Execution Sandbox

## Purpose

Add a safe execution boundary for connectors, scripts, validation tools, and future operator actions.

## Current Gap

The MVP has tool policies and dry-run concepts, but not a hardened sandbox with network egress controls, resource limits, per-tool permissions, artifact capture, and auditable execution envelopes.

## Target Operator Outcome

Operators can allow specific tools to run within declared boundaries, inspect artifacts, enforce dry-run and approval gates, and prove that out-of-policy actions are blocked.

## Safety Boundary

- The sandbox must prevent unauthorized target access.
- Block stealth, persistence, destructive actions, credential theft, secret exposure, and unapproved write operations.
- Default mode is dry-run or read-only.
- Model output cannot directly bypass sandbox policy.

## Proposed Architecture

- Tool manifest declares command or operation, allowed inputs, allowed network targets, write permissions, timeout, and artifact policy.
- Sandbox runner executes tools in a constrained process or container boundary.
- Egress policy checks destination allowlists before networked operations.
- Resource limiter enforces timeout, output size, CPU, and memory budgets.
- Artifact service captures stdout, stderr, files, hashes, and redacted summaries.
- Approval service gates high-impact or write-capable operations.

## Expected File Changes

New files:

- `apps/api/src/sandbox/tool-manifest.schema.ts`
- `apps/api/src/sandbox/tool-manifest-registry.ts`
- `apps/api/src/sandbox/sandbox-runner.ts`
- `apps/api/src/sandbox/egress-policy.ts`
- `apps/api/src/sandbox/resource-limits.ts`
- `apps/api/src/sandbox/artifact-capture-service.ts`
- `apps/api/src/sandbox/sandbox-audit-service.ts`
- `apps/api/src/schemas/sandbox.schema.ts`
- `apps/api/src/routes/sandbox.ts`
- `data/fixtures/sandbox/allowed-readonly-tool.json`
- `data/fixtures/sandbox/blocked-egress-tool.json`
- `data/fixtures/sandbox/approval-required-tool.json`
- `tests/unit/tool-execution-sandbox.test.ts`
- `tests/integration/tool-sandbox-flow.test.ts`
- `tests/security/sandbox-egress-policy.test.ts`
- `docs/runbooks/tool-sandbox-failure.md`

Existing files to modify:

- `apps/api/src/tools/tool-runner.ts`: delegate execution to sandbox runner.
- `apps/api/src/tools/tool-policy.ts`: enforce manifests and sandbox policy.
- `apps/api/src/tools/connector-registry.ts`: register sandbox-backed connector operations.
- `apps/api/src/actions/action-executor.ts`: require sandbox and approval for high-impact operations.
- `apps/api/src/actions/approval-service.ts`: integrate sandbox approval decisions.
- `apps/api/src/audit/audit-event-service.ts`: record sandbox execution envelope and artifacts.
- `apps/api/src/privacy/secure-logger.ts`: redact sandbox outputs.
- `apps/api/src/routes/tools.ts`: expose sandbox-backed execution status.
- `apps/api/src/app.ts`: register sandbox routes if separate.
- `docs/security/threat-model.md`: add sandbox trust boundary.
- `docs/api/openapi.yaml`: document sandbox endpoints.

## Data Model Additions

- `ToolManifest`: id, command or operation, allowed inputs, network policy, write policy, timeout, artifact policy.
- `SandboxRun`: id, manifest id, actor, status, startedAt, completedAt, policy decision.
- `SandboxArtifact`: run id, type, path or ref, hash, redaction status, size.
- `EgressDecision`: destination, allowed, reason, policy version.

## API Changes

- `GET /sandbox/manifests`
- `POST /sandbox/runs`
- `GET /sandbox/runs/:id`
- `GET /sandbox/runs/:id/artifacts`
- `POST /sandbox/runs/:id/approve`

## UI Changes

- Tool manifest review page.
- Sandbox run status and artifact viewer.
- Approval queue for write-capable or high-impact runs.
- Policy denial explanations.

## Milestones

- [x] Define tool permission manifest.
- [x] Add sandbox runner abstraction.
- [x] Add egress policy enforcement.
- [x] Add resource limits and timeouts.
- [x] Add artifact capture and redaction.
- [x] Add approval checks for write or high-impact actions.
- [x] Add operator runbooks for tool failures.

## Acceptance Criteria

- Tools cannot run outside declared permissions.
- High-impact actions require approval.
- Artifacts are captured, hashed, and redacted.
- Tool failures are structured and auditable.
- Blocked egress and timeout cases are tested.

## Test Plan

- Unit tests for manifests, egress policy, resource limits, and artifact redaction.
- Integration tests for allowed, denied, timeout, and approval-required tool runs.
- Security tests for secret redaction, blocked egress, and unauthorized writes.

## Rollout Notes

Implement policy and dry-run before any tool is allowed to perform writes or external validation.
