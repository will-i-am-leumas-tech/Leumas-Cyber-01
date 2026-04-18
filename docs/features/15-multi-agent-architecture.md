# 15 - Multi-Agent Architecture

## Purpose

Introduce bounded specialist agents for parsing, investigation, retrieval, reporting, safety review, and tool execution while preserving strict schemas, permissions, and auditability.

## Target Capability

- Decompose complex investigations into typed tasks.
- Assign tasks to specialist agents.
- Validate each agent output.
- Aggregate outputs into consistent case findings.
- Enforce different tool permissions per role.

## Current State

- Implemented in the MVP on 2026-04-17.
- Cases now store agent roles, tasks, results, orchestration runs, and arbitration results.
- The API exposes orchestration creation, run detail lookup, and case task listing.
- The web result view includes an Agents tab for run status, task output validation, and arbitration conflicts.

## Scope

- Agent role definitions.
- Task queue and task state.
- Shared case memory through structured artifacts.
- Output validation and arbitration.
- Tool permission boundaries.

## Non-Goals

- No unbounded autonomous loops.
- No agents with raw shell access.
- No unsafe offensive specialist roles.
- No hidden changes to cases without audit entries.

## Proposed Architecture

- `AgentRole`: parser, investigator, retriever, reporter, safetyReviewer, toolExecutor.
- `AgentTask`: role, input artifact refs, expected schema, status, timeout.
- `AgentResult`: output, validation status, confidence, warnings.
- `OrchestrationRun`: caseId, plan, taskIds, finalStatus.
- `ArbitrationResult`: selected findings, conflicts, reviewer notes.

Suggested modules:

- `apps/api/src/agents/agent-orchestrator.ts`
- `apps/api/src/agents/agent-task-service.ts`
- `apps/api/src/agents/roles/*.agent.ts`
- `apps/api/src/agents/result-validator.ts`
- `apps/api/src/routes/agents.ts`

## Data Model

Add:

- `agentRoles[]`
- `agentTasks[]`
- `agentResults[]`
- `orchestrationRuns[]`
- `arbitrationResults[]`

## API Changes

- `POST /cases/:id/orchestrations`
- `GET /cases/:id/orchestrations/:runId`
- `GET /cases/:id/agent-tasks`

## UI Changes

- Investigation progress view.
- Agent task status list.
- Conflicting finding review panel.
- Safety reviewer output display.

## Scaffold Steps

1. Add role and task schemas.
2. Create deterministic local agents that wrap existing services.
3. Add orchestrator for standard analysis flow.
4. Add validation and timeout handling.
5. Store task outputs and audit entries.
6. Add UI status view.

## Test Plan

- Unit: orchestrator creates expected tasks for a log case.
- Unit: invalid agent output fails validation.
- Unit: role cannot request unauthorized tools.
- Integration: orchestration run completes with deterministic agents.
- Safety: safety reviewer can block unsafe final output.

## Fixtures

- `data/fixtures/agents/standard-log-plan.json`
- `data/fixtures/agents/invalid-agent-result.json`
- `data/fixtures/agents/conflicting-findings.json`

## Acceptance Criteria

- Orchestrated analysis produces same or better findings than direct pipeline.
- Every agent task has typed input and output.
- Role permissions are enforced.
- Failed tasks are visible and auditable.
- No unvalidated agent output is shown as final.

## MVP Verification

- `npm test -- tests/unit/agent-orchestrator.test.ts tests/integration/agent-flow.test.ts`: 2 files, 5 tests passed.
- `npm run typecheck`: API and web TypeScript passed.
- `npm test`: 38 files, 86 tests passed.
- `npm run build`: API TypeScript and web production build passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
