# 06 - Safe Autonomous Actions

## Purpose

Allow the system to prepare and execute low-risk defensive actions only when policy, permissions, and human approvals allow it.

## Target Capability

- Separate action planning from action execution.
- Preview impact before execution.
- Require approvals for high-risk actions.
- Keep a full audit trail for all proposed, approved, rejected, failed, and completed actions.
- Support rollback metadata when an action is reversible.

## Current State

- The MVP recommends actions as text.
- No actions are executed through tools.
- No approval model exists.

## Scope

- Action plan schema.
- Approval workflow.
- Dry-run execution.
- Policy checks.
- Mock action executor.

## Non-Goals

- No unsupervised account disablement, host isolation, firewall changes, or production changes.
- No offensive actions.
- No bypassing tool-native authorization.

## Proposed Architecture

- `ActionPlan`: objective, steps, risk, target entities, expected outcome.
- `ActionStep`: connector, operation, parameters, dryRunResult, approvalRequired.
- `ApprovalRequest`: approver role, requestedBy, actionPlanId, status, reason.
- `ActionExecution`: actionStepId, status, result, rollbackHint, timestamp.
- `ActionPolicy`: allowed actions, approval thresholds, blocked target types.

Suggested modules:

- `apps/api/src/actions/action-planner.ts`
- `apps/api/src/actions/action-policy.ts`
- `apps/api/src/actions/approval-service.ts`
- `apps/api/src/actions/action-executor.ts`
- `apps/api/src/routes/actions.ts`

## Data Model

Add:

- `actionPlans[]`
- `approvalRequests[]`
- `actionExecutions[]`
- `actionPolicies[]`

## API Changes

- `POST /cases/:id/action-plans`
- `POST /cases/:id/action-plans/:planId/dry-run`
- `POST /cases/:id/action-plans/:planId/approval`
- `POST /cases/:id/action-plans/:planId/execute`
- `GET /cases/:id/actions`

## UI Changes

- Action plan panel.
- Dry-run preview.
- Approval status.
- Execution timeline.
- Clear labels for manual-only recommendations.

## Scaffold Steps

1. Add action schemas and policy engine.
2. Convert current recommendations into manual action plans.
3. Add mock executor for safe no-op actions.
4. Add approval routes.
5. Add action tab in case view.
6. Wire audit entries for every action event.

## Test Plan

- Unit: high-risk actions require approval.
- Unit: denied targets cannot execute.
- Unit: dry-run creates no external state change.
- Integration: create, approve, and execute mock action.
- Safety: action executor refuses unknown operation types.

## Fixtures

- `data/fixtures/actions/manual-containment-plan.json`
- `data/fixtures/actions/blocked-high-risk-action.json`
- `data/fixtures/actions/mock-approved-action.json`

## Acceptance Criteria

- All actions have dry-run or manual-only status.
- High-risk actions cannot execute without approval.
- Every action event is audited.
- Action results are linked to case evidence.
- Unsafe or unknown actions are denied by default.

