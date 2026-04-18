# 01 - Model Quality And Cyber Reasoning

## Purpose

Move analysis from simple heuristics to evidence-grounded cyber reasoning. The system should reason over observations, hypotheses, confidence, affected entities, and recommended defensive actions without making unsupported claims.

## Target Capability

- Build explicit hypotheses from submitted evidence.
- Connect each conclusion to source records or analyst-provided facts.
- Separate facts, inferences, assumptions, and unknowns.
- Explain severity, confidence, and recommended action priority.
- Ask for clarification when evidence is insufficient.
- Produce structured outputs that can be validated before display or storage.

## Current State

- The API uses deterministic adapters for basic alert, log, IOC, and hardening flows.
- Provider output is recorded as a note, but not used as a validated reasoning layer.
- Evidence is a list of strings rather than source-linked observations.

## Scope

- Add typed reasoning artifacts.
- Add model prompt templates for defensive analysis.
- Add validators for model-generated structured output.
- Add confidence scoring tied to evidence coverage.
- Add gap analysis when evidence is missing.

## Non-Goals

- No hidden chain-of-thought exposure.
- No unsupported autonomous action execution.
- No offensive exploit planning, payload generation, persistence, evasion, credential theft, or unauthorized targeting guidance.

## Proposed Architecture

- `Observation`: atomic fact extracted from input with source reference.
- `Hypothesis`: candidate explanation with supporting and contradicting observations.
- `Finding`: analyst-facing conclusion with severity, confidence, evidence references, and recommended actions.
- `ReasoningRun`: provider call metadata, prompt version, model name, validation status, and safety decision.
- `ReasoningValidator`: validates schema, evidence references, confidence bounds, and blocked content.

Suggested modules:

- `apps/api/src/reasoning/observation-builder.ts`
- `apps/api/src/reasoning/hypothesis-service.ts`
- `apps/api/src/reasoning/finding-composer.ts`
- `apps/api/src/reasoning/reasoning-validator.ts`
- `apps/api/src/prompts/defensive-analysis.prompt.ts`

## Data Model

Add:

- `observations[]`: id, sourceRef, timestamp, entityRefs, type, value, confidence.
- `hypotheses[]`: id, title, status, supportingObservationIds, contradictingObservationIds, confidence.
- `findings[]`: id, title, severity, category, evidenceObservationIds, recommendations, confidence.
- `reasoningRuns[]`: id, provider, model, promptVersion, inputHash, outputHash, validationStatus.

## API Changes

- Extend `POST /analyze` response with `observations`, `hypotheses`, and `findings`.
- Add `GET /cases/:id/reasoning` for structured reasoning artifacts.
- Add optional `analysisDepth`: `quick | standard | deep`.

## UI Changes

- Add evidence-linked findings.
- Add assumptions and unknowns panel.
- Add confidence explanation next to severity.
- Add "needs analyst review" state for low-confidence or high-impact findings.

## Scaffold Steps

1. Define Zod schemas for observations, hypotheses, findings, and reasoning runs.
2. Convert existing adapter evidence into `Observation` records.
3. Add deterministic hypothesis builder for existing fixtures.
4. Add provider prompt template for structured findings.
5. Add validator that rejects findings without evidence references.
6. Add UI rendering for findings and observations.

## Test Plan

- Unit: observation extraction from PowerShell, brute-force, and IOC fixtures.
- Unit: confidence scoring lowers confidence when evidence is sparse.
- Unit: validator rejects findings with missing evidence IDs.
- Integration: `/analyze` returns observations and findings for existing flows.
- Integration: unsafe provider output is blocked or sanitized.
- Regression: existing report generation still works.

## Fixtures

- `data/fixtures/reasoning/powershell-observations.json`
- `data/fixtures/reasoning/bruteforce-hypotheses.json`
- `data/fixtures/reasoning/invalid-finding-no-evidence.json`

## Acceptance Criteria

- Every high or critical finding has at least one evidence reference.
- Confidence is bounded between 0 and 1 and explained in summary form.
- Unsupported conclusions fail validation.
- Reports include facts, assumptions, and unknowns.
- Tests cover both valid and invalid reasoning artifacts.

