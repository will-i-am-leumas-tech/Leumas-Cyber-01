# 04 - Investigation Workflow Engine

## Purpose

Turn one-shot analysis into an analyst workflow with case state, assigned tasks, evidence, decisions, review, and closure.

## Target Capability

- Track case lifecycle from intake to closure.
- Generate and manage investigation tasks.
- Record analyst decisions and rationale.
- Link tasks, findings, evidence, and reports.
- Support escalation and review.

## Current State

- Cases are saved as local JSON.
- Audit entries record basic pipeline actions.
- No workflow state, assignment, tasking, or closure model exists.

## Scope

- Case statuses.
- Task model.
- Decision records.
- Evidence links.
- Workflow events and transitions.

## Non-Goals

- No enterprise ticketing sync in the first scaffold.
- No autonomous containment action execution.
- No replacing human incident commander approval.

## Proposed Architecture

- `CaseState`: new, triaging, investigating, contained, remediating, monitoring, closed.
- `InvestigationTask`: title, owner, priority, status, dueAt, linkedFindingIds.
- `DecisionRecord`: decision, rationale, approver, evidenceRefs, timestamp.
- `WorkflowTransition`: from, to, actor, reason, timestamp.

Suggested modules:

- `apps/api/src/workflow/case-state-machine.ts`
- `apps/api/src/workflow/task-service.ts`
- `apps/api/src/workflow/decision-service.ts`
- `apps/api/src/routes/workflow.ts`

## Data Model

Add to case:

- `state`
- `tasks[]`
- `decisions[]`
- `workflowTransitions[]`
- `assignedTo`
- `priority`
- `tags[]`

## API Changes

- `POST /cases/:id/state`
- `POST /cases/:id/tasks`
- `PATCH /cases/:id/tasks/:taskId`
- `POST /cases/:id/decisions`
- `GET /cases/:id/workflow`

## UI Changes

- Case status control.
- Task checklist tab.
- Decision log tab.
- Priority and assignment fields.
- Closure checklist.

## Scaffold Steps

1. Add workflow schemas.
2. Add state machine with allowed transitions.
3. Generate default tasks from analysis result.
4. Add routes for task and state updates.
5. Add workflow tab to dashboard.
6. Include workflow events in audit log.

## Test Plan

- Unit: valid and invalid state transitions.
- Unit: default task generation from PowerShell and brute-force fixtures.
- Integration: create case, update state, add task, close task.
- Permission-ready test: route accepts actor metadata placeholder.
- Regression: existing case listing still works.

## Fixtures

- `data/fixtures/workflow/default-powershell-tasks.json`
- `data/fixtures/workflow/invalid-transition.json`

## Acceptance Criteria

- Cases have a visible lifecycle state.
- Invalid transitions are rejected.
- Default tasks are generated for supported analysis modes.
- All workflow changes create audit entries.
- A case cannot close while required tasks remain open unless an override decision is recorded.

