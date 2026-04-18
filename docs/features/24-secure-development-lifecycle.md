# 24 - Secure Development Lifecycle

## Purpose

Add engineering controls so the project can be developed, tested, released, and operated with security discipline.

## Target Capability

- Run CI for tests, typecheck, build, and audit.
- Scan code and dependencies.
- Scan secrets.
- Produce SBOMs.
- Sign releases later.
- Maintain a threat model.

## Current State

- Local scripts now cover linting, typecheck, secret scanning, SBOM generation, safety evals, tests, build, and dependency audit.
- GitHub Actions workflows run CI release gates and scheduled/on-demand security checks.
- Security docs now define the threat model, dependency update policy, release checklist, and secret-scan allowlist process.
- The secret scanner detects common provider keys, cloud keys, GitHub tokens, private keys, and assigned secret values while requiring explicit approvals for synthetic fixtures.
- The SBOM generator produces a CycloneDX 1.5 JSON document from `package-lock.json` at `tmp/sbom.json`.

## Scope

- CI pipeline.
- Linting and formatting policy.
- Secret scanning.
- Dependency update policy.
- Threat model docs.
- Release checklist.

## Non-Goals

- No security certification claim.
- No bypassing audit failures without documented exception.
- No committing real secrets in fixtures.

## Proposed Architecture

- `ci.yml`: install, test, typecheck, build, audit.
- `security-scan.yml`: static analysis and secret scanning.
- `threat-model.md`: assets, trust boundaries, threats, mitigations.
- `release-checklist.md`: verification steps and sign-off.
- `dependency-policy.md`: update cadence and exception handling.

Suggested files:

- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `docs/security/threat-model.md`
- `docs/security/dependency-policy.md`
- `docs/security/release-checklist.md`
- `docs/security/secret-scan-allowlist.json`
- `scripts/lint.ts`
- `scripts/security-scan.ts`
- `scripts/generate-sbom.ts`

## Data Model

No application data model changes.

## API Changes

None.

## UI Changes

None.

## Scaffold Steps

1. Add lint script and config. Completed with `npm run lint`.
2. Add CI workflow for npm install, test, typecheck, build, and audit. Completed in `.github/workflows/ci.yml`.
3. Add secret scanning workflow. Completed in `.github/workflows/security.yml`.
4. Add threat model document. Completed in `docs/security/threat-model.md`.
5. Add dependency policy. Completed in `docs/security/dependency-policy.md`.
6. Add release checklist. Completed in `docs/security/release-checklist.md`.
7. Add SBOM generation. Completed with `npm run security:sbom`.
8. Add local CI parity command. Completed with `npm run ci:verify`.

## Test Plan

- CI must pass on a clean checkout.
- Secret scan detects seeded fake secret fixture and ignores approved test patterns.
- Audit failure blocks release workflow.
- Threat model review is required before adding new tool connectors.
- `npm run ci:verify` should be the local pre-release gate.
- `npm run security:scan` must fail on unapproved synthetic or real-looking secrets.
- `npm run security:sbom` must produce a CycloneDX file with package-lock dependencies.

## Fixtures

- `docs/security/examples/fake-secret-for-scanner.txt` if scanner supports test fixtures.

## Acceptance Criteria

- CI runs all existing verification commands.
- Dependency audit is part of CI.
- Secret scanning is enabled.
- Threat model exists and identifies model/tool/storage trust boundaries.
- Release checklist references test, build, audit, and safety evals.

## MVP Verification

- `npm test -- tests/unit/secure-development-lifecycle.test.ts` verifies SDL-specific scanner, workflow, docs, and SBOM behavior.
- `npm run lint` validates text hygiene across source, docs, workflows, tests, and scripts.
- `npm run security:scan` validates zero unapproved repository secret findings.
- `npm run security:sbom` generates `tmp/sbom.json`.
- `npm run ci:verify` is expected to run the complete release gate: lint, typecheck, secret scan, evals, tests, build, and dependency audit.
