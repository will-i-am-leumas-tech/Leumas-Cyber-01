# 05 - Detection Engineering V2

## Purpose

Turn detection generation into a production workflow for writing, testing, tuning, deploying, and monitoring defensive rules.

## Current Gap

The MVP can scaffold and test a narrow detection flow, but it does not yet support multiple rule formats, deployment tracking, false-positive simulation, coverage management, or rule drift.

## Target Operator Outcome

A detection engineer can generate a rule from case evidence, validate the syntax, run positive and negative tests, inspect expected false positives, map coverage to ATT&CK, and track deployment status.

## Safety Boundary

- Detections focus on defensive discovery of suspicious behavior.
- Do not include instructions for stealth, evasion, payload weaponization, or bypassing detections.
- Any offensive validation content must stay in authorized lab and control-testing contexts.

## Proposed Architecture

- Rule format registry defines supported languages and validator hooks.
- Rule translator converts an abstract detection intent into Sigma, YARA, KQL, SPL, EQL, Lucene, Suricata, or Snort where appropriate.
- Rule validator checks syntax, required metadata, unsafe content, and backend compatibility.
- Test corpus service stores positive and negative examples.
- False-positive simulator scores rule behavior against benign fixtures.
- Deployment tracker records target backend, version, status, drift, and owner.

## Expected File Changes

New files:

- `apps/api/src/detections/rule-format-registry.ts`
- `apps/api/src/detections/rule-validator.ts`
- `apps/api/src/detections/yara-rule-builder.ts`
- `apps/api/src/detections/spl-query-translator.ts`
- `apps/api/src/detections/kql-query-translator.ts`
- `apps/api/src/detections/false-positive-simulator.ts`
- `apps/api/src/detections/detection-corpus-service.ts`
- `apps/api/src/detections/deployment-tracker.ts`
- `apps/api/src/schemas/detections-v2.schema.ts`
- `data/fixtures/detections/yara-suspicious-script.yar`
- `data/fixtures/detections/benign-admin-powershell.log`
- `data/fixtures/detections/positive-powershell-execution.log`
- `tests/unit/detection-engineering-v2.test.ts`
- `tests/integration/detection-lifecycle-flow.test.ts`
- `docs/analyst-guide/detection-engineering.md`

Existing files to modify:

- `apps/api/src/detections/detection-intent-builder.ts`: include evidence ids and ATT&CK goals.
- `apps/api/src/detections/query-translator.ts`: delegate to format-specific translators.
- `apps/api/src/detections/rule-test-runner.ts`: support corpus and false-positive scoring.
- `apps/api/src/detections/sigma-rule-builder.ts`: enforce metadata and safety checks.
- `apps/api/src/routes/detections.ts`: add validation, corpus, deployment, and tuning endpoints.
- `apps/api/src/schemas/detections.schema.ts`: add v2 rule lifecycle types.
- `apps/api/src/schemas/case.schema.ts`: store deployment and test results.
- `apps/web/src/components/CaseWorkspacePage.tsx`: surface detection lifecycle status.
- `docs/api/openapi.yaml`: document new detection lifecycle endpoints.

## Data Model Additions

- `DetectionRuleV2`: rule id, format, content, metadata, evidence ids, owner, status.
- `DetectionCorpusItem`: id, label, source, expected match, event data, tags.
- `RuleValidationResult`: syntax status, safety status, backend status, warnings.
- `FalsePositiveResult`: benign corpus matches, risk score, tuning suggestions.
- `DetectionDeployment`: backend, version, status, deployedAt, drift status.

## API Changes

- `POST /detections/rules/:id/validate`
- `POST /detections/rules/:id/test-corpus`
- `POST /detections/rules/:id/simulate-false-positives`
- `POST /detections/rules/:id/deployments`
- `GET /detections/coverage`

## UI Changes

- Rule editor with validation output.
- Test corpus runner and false-positive summary.
- Detection deployment and drift panel.
- ATT&CK coverage view.

## Milestones

- [x] Add rule format registry.
- [x] Add validators for Sigma-like JSON, YARA, KQL, and SPL first.
- [x] Add test corpus service.
- [x] Add false-positive scoring.
- [x] Add ATT&CK coverage dashboard data.
- [x] Add deployment status records.
- [ ] Add advanced detection tuning workflow.

## Acceptance Criteria

- Generated detections include tests and evidence citations.
- Rules fail validation when unsupported fields or unsafe content appears.
- Analysts can see coverage, validation warnings, and expected false positives.
- Deployment records are versioned and auditable.

## Test Plan

- Unit tests for rule translators, validators, and false-positive simulation.
- Integration tests for rule lifecycle, corpus tests, deployment records, and case linkage.
- Eval tests for detection quality, evidence citation, and safety.

## Rollout Notes

Prioritize Sigma, KQL, and SPL before network or file-signature rules. Add deployment integrations only after read-only connector work is stable.

## MVP Implementation Notes

- Added `DetectionRuleV2`, corpus, validation, false-positive simulation, deployment, and coverage schemas in `apps/api/src/schemas/detections-v2.schema.ts`.
- Added a rule format registry for Sigma-like JSON, KQL, SPL, and YARA.
- Added KQL and SPL translators plus a defensive YARA rule builder.
- Added v2 validation with syntax, metadata, and safety checks.
- Added corpus testing and false-positive simulation over deterministic fixture events.
- Added deployment tracker records with backend, version, owner, status, and drift state.
- Extended detection routes with format listing, v2 validation, corpus testing, false-positive simulation, deployment recording, and case coverage summaries.
- Added analyst docs and fixture coverage for benign and positive PowerShell examples.

Remaining production work is richer backend-specific syntax validation, saved tuning recommendations, native Sigma/YARA parsers, scheduled drift checks, and UI panels for rule lifecycle review.
