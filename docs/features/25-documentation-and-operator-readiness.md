# 25 - Documentation And Operator Readiness

## Purpose

Give developers, analysts, admins, and operators enough documentation to install, configure, use, extend, secure, and troubleshoot the system.

## Target Capability

- Clear local and production setup docs.
- Analyst workflow guide.
- Admin and connector setup guide.
- API reference.
- Safety policy guide.
- Troubleshooting and runbooks.
- Example incident walkthroughs.

## Current State

- README includes quick start and basic safety boundary.
- `goal.md` defines product intent.
- Roadmap and feature outlines exist.
- Operator documentation now includes local development, analyst workflow, admin configuration, connector setup, safety policy, provider-down runbook, and a PowerShell alert walkthrough.
- `docs/api/openapi.yaml` documents the supported MVP API surface.
- `GET /docs/openapi.json` serves the OpenAPI document for local operator tooling.
- `npm run docs:check` validates required docs, local markdown links, setup commands, OpenAPI path coverage, and safety examples.

## Scope

- Documentation structure.
- API docs.
- Operator runbooks.
- Analyst tutorials.
- Connector setup docs.
- Safety examples.

## Non-Goals

- No documentation that teaches misuse.
- No unsupported deployment claims.
- No secrets or live customer data in examples.

## Proposed Architecture

Documentation groups:

- `docs/getting-started/`
- `docs/analyst-guide/`
- `docs/admin-guide/`
- `docs/api/`
- `docs/connectors/`
- `docs/security/`
- `docs/runbooks/`
- `docs/examples/`

Suggested files:

- `docs/getting-started/local-dev.md`
- `docs/analyst-guide/triage-workflow.md`
- `docs/admin-guide/configuration.md`
- `docs/api/openapi.yaml`
- `docs/connectors/local-connectors.md`
- `docs/security/safety-policy.md`
- `docs/runbooks/provider-down.md`
- `docs/examples/powershell-alert-walkthrough.md`
- `docs/README.md`

## Data Model

No application data model changes, except optional generated OpenAPI metadata from route schemas.

## API Changes

- Added static OpenAPI metadata in the API package.
- Added `GET /docs/openapi.json` to serve the current MVP OpenAPI document.

## UI Changes

- Link to docs from app footer or admin menu later.
- Add inline help for safety decisions and analysis modes.

## Scaffold Steps

1. Create docs directory structure. Completed.
2. Add local dev guide. Completed in `docs/getting-started/local-dev.md`.
3. Add analyst workflow guide using current fixtures. Completed in `docs/analyst-guide/triage-workflow.md`.
4. Add safety policy examples. Completed in `docs/security/safety-policy.md`.
5. Add OpenAPI scaffold. Completed in `docs/api/openapi.yaml` and `GET /docs/openapi.json`.
6. Add operator troubleshooting runbook. Completed in `docs/runbooks/provider-down.md`.
7. Add docs readiness check. Completed with `npm run docs:check`.

## Test Plan

- Docs links resolve.
- Code snippets in docs are executable or clearly marked illustrative.
- API examples match current endpoints.
- Safety docs include allowed, blocked, and ambiguous examples.
- CI runs documentation readiness checks through `npm run ci:verify`.

## Fixtures

- Use existing alert, log, IOC, and hardening fixtures in walkthroughs.

## Acceptance Criteria

- A new developer can run the app from docs alone.
- A new analyst can complete a sample triage walkthrough.
- Admin docs explain environment variables and provider configuration.
- API docs list request and response shapes.
- Safety docs clearly define boundaries and safe redirects.

## MVP Verification

- `npm run docs:check` validates required docs and local links.
- `npm test -- tests/unit/documentation-readiness.test.ts tests/integration/docs-flow.test.ts` validates docs readiness logic and the OpenAPI route.
- `npm run ci:verify` includes the docs check before typecheck, security scan, evals, tests, build, and audit.
