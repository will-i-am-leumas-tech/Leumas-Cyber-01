# 02 - Cyber Reasoning Engine

## Purpose

Move from simple findings to a defensible reasoning engine that can explain hypotheses, evidence support, contradictions, confidence, unknowns, and recommended next evidence.

## Current Gap

The MVP stores observations and findings, but deep reasoning is still shallow. It does not yet create competing hypothesis trees, detect contradictions across sources, reason about blast radius, or force every high-impact conclusion to cite evidence.

## Target Operator Outcome

An analyst can open a case and see why the system believes a finding, what evidence supports it, what evidence weakens it, what remains unknown, and what collection steps would improve confidence.

## Safety Boundary

- Reasoning may describe observed attacker behavior and defensive implications.
- It must not provide exploit chains, stealth, persistence, credential theft, or unauthorized action guidance.
- ATT&CK mapping must be descriptive and evidence-based.
- Weak evidence must produce review flags, not confident claims.

## Proposed Architecture

- Hypothesis graph service builds competing explanations from observations.
- Evidence support service scores each hypothesis and finding.
- Contradiction detector compares event timelines, entities, source reliability, and model claims.
- ATT&CK mapper emits technique mappings only when required evidence exists.
- Unknowns service creates missing-evidence questions and collection recommendations.
- Reasoning reviewer marks findings as supported, weak, contradicted, or analyst-reviewed.

## Expected File Changes

New files:

- `apps/api/src/reasoning/hypothesis-graph-service.ts`
- `apps/api/src/reasoning/evidence-support-service.ts`
- `apps/api/src/reasoning/contradiction-detector.ts`
- `apps/api/src/reasoning/attack-mapping-service.ts`
- `apps/api/src/reasoning/unknowns-service.ts`
- `apps/api/src/schemas/reasoning-v2.schema.ts`
- `data/fixtures/reasoning/competing-hypotheses.json`
- `data/fixtures/reasoning/contradictory-evidence.json`
- `data/fixtures/reasoning/weak-evidence-case.json`
- `tests/unit/cyber-reasoning-engine.test.ts`
- `tests/integration/reasoning-v2-flow.test.ts`
- `docs/analyst-guide/reasoning-review.md`

Existing files to modify:

- `apps/api/src/reasoning/reasoning-service.ts`: orchestrate v2 reasoning.
- `apps/api/src/reasoning/finding-composer.ts`: require evidence support records.
- `apps/api/src/reasoning/reasoning-validator.ts`: reject unsupported high-impact findings.
- `apps/api/src/schemas/reasoning.schema.ts`: extend with hypotheses, contradictions, unknowns, and review status.
- `apps/api/src/schemas/case.schema.ts`: persist reasoning v2 records.
- `apps/api/src/routes/cases.ts`: include reasoning summaries in case reads.
- `apps/api/src/routes/analyze.ts`: return reasoning quality warnings.
- `apps/web/src/components/CaseWorkspacePage.tsx`: surface reasoning review panels.
- `docs/api/openapi.yaml`: document reasoning fields returned by case and analysis routes.

## Data Model Additions

- `HypothesisNode`: id, title, description, status, confidence, evidence ids, counter-evidence ids.
- `ContradictionRecord`: source ids, conflict type, explanation, severity, resolution status.
- `UnknownRecord`: question, reason, priority, suggested source, analyst owner.
- `TechniqueMapping`: framework, tactic, technique id, evidence ids, confidence.
- `ReasoningReview`: reviewer, status, notes, timestamp.

## API Changes

- Extend `GET /cases/:id` with hypothesis graph, contradictions, unknowns, and technique mappings.
- Optional `POST /cases/:id/reasoning/review` to mark reasoning items reviewed.
- Optional `GET /cases/:id/reasoning` for focused reasoning retrieval.

## UI Changes

- Hypothesis tree panel.
- Evidence support and counter-evidence panel.
- Unknowns and collection checklist.
- Reasoning review state on findings.

## Milestones

- [x] Add hypothesis graph schema.
- [x] Add evidence support scoring.
- [x] Add contradiction and uncertainty records.
- [x] Add ATT&CK mapping service with evidence requirements.
- [x] Add analyst review workflow.
- [ ] Add false-positive and alternate-explanation generation.
- [ ] Add root-cause and blast-radius summaries.
- [ ] Add broader reasoning quality evals.

## Acceptance Criteria

- Every high-severity finding links to supporting evidence.
- Weak cases include alternate explanations and unknowns.
- Contradictions are shown instead of hidden.
- ATT&CK mappings are not emitted without evidence.
- Analysts can mark reasoning reviewed.

## Test Plan

- Unit tests for hypothesis scoring, contradiction detection, and ATT&CK mapping evidence requirements.
- Integration tests for analysis output, case persistence, and reasoning review.
- Eval tests for hallucination, false-positive analysis, evidence support, and unknowns.

## Rollout Notes

Keep v1 reasoning fields available until UI and API consumers are moved to the v2 schema.

## MVP Implementation Notes

- Added reasoning v2 schemas in `apps/api/src/schemas/reasoning-v2.schema.ts`.
- Added hypothesis graph, evidence support, contradiction, unknowns, and ATT&CK mapping services in `apps/api/src/reasoning`.
- Added reasoning v2 persistence fields on cases.
- Added `GET /cases/:id/reasoning/v2` and `POST /cases/:id/reasoning/review`.
- Added analyst documentation in `docs/analyst-guide/reasoning-review.md`.
- Added focused unit and integration tests for reasoning v2 artifacts and review audit behavior.
