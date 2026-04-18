# 07 - Detection Engineering

## Purpose

Help analysts create, validate, tune, and manage defensive detections from case evidence without producing harmful operational guidance.

## Target Capability

- Generate detection logic from observed behavior.
- Validate generated rules against schemas.
- Test rules against positive and negative fixtures.
- Explain data-source requirements and expected false positives.
- Translate abstract detections to SIEM-specific query languages where supported.

## Current State

- No detection rule model exists.
- Recommendations are text-only.
- No Sigma, YARA, or query validation exists.

## Scope

- Detection intent model.
- Sigma-like rule scaffold.
- Query generation adapter.
- Rule validation and testing harness.
- Detection coverage mapping to ATT&CK-style categories.

## Non-Goals

- No exploit or payload generation.
- No evasion guidance.
- No deployment to production SIEM without approval.

## Proposed Architecture

- `DetectionIntent`: behavior, data sources, entities, severity, evidence refs.
- `DetectionRule`: format, title, logic, fields, falsePositiveNotes, validationStatus.
- `RuleTestCase`: event fixture, expectedMatch, reason.
- `RuleValidationResult`: schema status, fixture status, warnings.
- `DetectionCoverage`: tactic, technique, data source, confidence.

Suggested modules:

- `apps/api/src/detections/detection-intent-builder.ts`
- `apps/api/src/detections/sigma-rule-builder.ts`
- `apps/api/src/detections/query-translator.ts`
- `apps/api/src/detections/rule-test-runner.ts`
- `apps/api/src/routes/detections.ts`

## Data Model

Add:

- `detectionIntents[]`
- `detectionRules[]`
- `ruleTestCases[]`
- `ruleValidationResults[]`

## API Changes

- `POST /cases/:id/detections`
- `POST /cases/:id/detections/:detectionId/validate`
- `POST /cases/:id/detections/:detectionId/test`
- `GET /cases/:id/detections`

## UI Changes

- Detection tab.
- Rule editor with validation status.
- Fixture test results.
- Data source coverage indicators.

## Scaffold Steps

1. Add detection schemas.
2. Build detection intent from existing findings.
3. Generate a simple Sigma-like JSON/YAML object.
4. Add schema validation.
5. Add fixture-based match tests for simple field conditions.
6. Render detections in UI.

## Test Plan

- Unit: detection intent includes evidence refs.
- Unit: validator rejects missing logsource or detection logic.
- Unit: fixture runner passes known positive and negative events.
- Integration: `/analyze` case can generate a detection from PowerShell finding.
- Safety: generated detections do not contain payloads or bypass instructions.

## Fixtures

- `data/fixtures/detections/powershell-positive.json`
- `data/fixtures/detections/powershell-negative-admin.json`
- `data/fixtures/detections/invalid-rule.json`

## Acceptance Criteria

- Detection rules validate before display as deployable.
- Rules include data source assumptions.
- Fixture tests show expected matches and non-matches.
- Analyst can export detection text.
- Every generated detection links back to case evidence.

