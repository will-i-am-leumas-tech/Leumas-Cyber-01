# 13 - Multi-Agent Reliability V2

## Purpose

Make multi-agent workflows reliable enough for real investigations, with specialist roles, arbitration, budgets, traceability, and operator review.

## Current Gap

The MVP has bounded deterministic agent scaffolding, but lacks specialist agent contracts, robust arbitration, cross-agent memory, reviewer agents, and operational reliability controls.

## Target Operator Outcome

An analyst can run a bounded multi-agent investigation, inspect each specialist's evidence-backed output, see how conflicts were resolved, and override or approve the final case recommendations.

## Safety Boundary

- Agents inherit all safety, tool, data, tenant, and authorization policies.
- No agent may directly execute high-impact actions.
- Agents cannot bypass scope controls, tool sandbox policy, provider safety gates, or approval workflows.
- Unsafe or unsupported recommendations are blocked or marked for review.

## Proposed Architecture

- Agent role registry defines specialist roles, allowed tasks, required evidence, budgets, and output schemas.
- Agent memory service stores case-scoped, evidence-grounded memory only.
- Orchestrator v2 plans specialist tasks and enforces budgets.
- Arbitration service resolves conflicting findings using evidence support and source reliability.
- Reviewer agent checks grounding, safety, and completeness.
- Trace service records agent inputs, outputs, decisions, tool calls, and policy decisions.
- Operator override service captures review notes and final decision.

## Expected File Changes

New files:

- `apps/api/src/agents/agent-role-registry.ts`
- `apps/api/src/agents/agent-budget-service.ts`
- `apps/api/src/agents/agent-memory-service.ts`
- `apps/api/src/agents/arbitration-service.ts`
- `apps/api/src/agents/reviewer-agent.ts`
- `apps/api/src/agents/agent-trace-service.ts`
- `apps/api/src/agents/operator-override-service.ts`
- `apps/api/src/schemas/agents-v2.schema.ts`
- `data/fixtures/agents/specialist-role-contracts.json`
- `data/fixtures/agents/conflicting-specialist-findings.json`
- `data/fixtures/agents/reviewer-grounding-failure.json`
- `tests/unit/multi-agent-reliability-v2.test.ts`
- `tests/integration/multi-agent-reliability-flow.test.ts`
- `tests/evals/multi-agent-investigation.test.ts`
- `docs/analyst-guide/multi-agent-investigations.md`

Existing files to modify:

- `apps/api/src/agents/agent-orchestrator.ts`: migrate to role registry, budgets, and reviewer flow.
- `apps/api/src/agents/agent-task-service.ts`: add specialist role, budget, and trace metadata.
- `apps/api/src/agents/result-validator.ts`: require evidence support and safety status.
- `apps/api/src/routes/agents.ts`: expose traces, arbitration results, and operator overrides.
- `apps/api/src/schemas/agents.schema.ts`: extend with v2 roles, traces, and overrides.
- `apps/api/src/schemas/case.schema.ts`: store agent traces and arbitration records.
- `apps/api/src/reasoning/evidence-grounding-validator.ts`: reuse for reviewer agent if implemented.
- `apps/web/src/components/CaseWorkspacePage.tsx`: show agent traces and arbitration results.
- `docs/api/openapi.yaml`: document agent v2 endpoints.

## Data Model Additions

- `AgentRole`: id, domain, allowed tasks, output schema, budget, safety requirements.
- `AgentTrace`: task id, role id, input refs, output refs, tool refs, policy decisions, duration.
- `ArbitrationResult`: conflicting outputs, selected result, rationale, evidence ids, reviewer status.
- `AgentMemoryItem`: case id, evidence ids, summary, source, expiry, review state.
- `OperatorOverride`: actor, decision, reason, timestamp, affected findings.

## API Changes

- `GET /agents/roles`
- `POST /cases/:id/agents/investigate`
- `GET /cases/:id/agents/traces`
- `POST /cases/:id/agents/arbitrate`
- `POST /cases/:id/agents/overrides`

## UI Changes

- Multi-agent investigation launcher.
- Specialist output cards with evidence links.
- Conflict and arbitration panel.
- Reviewer findings and override workflow.

## Milestones

- [x] Define specialist role contracts.
- [x] Add task budget and timeout controls.
- [x] Add arbitration service for conflicting findings.
- [x] Add reviewer agent for evidence grounding.
- [x] Add cross-agent trace records.
- [x] Add operator override workflow.
- [x] Add multi-agent evals.

## Acceptance Criteria

- Agent output is attributable and reviewable.
- Conflicts produce explicit arbitration results.
- Agents stop within budget.
- Unsafe or unsupported recommendations are blocked.
- Operator overrides are audited.

## Test Plan

- Unit tests for role contracts, budgets, arbitration, memory, and reviewer validation.
- Integration tests for specialist workflows, conflict resolution, traces, and overrides.
- Eval tests for conflicting evidence, long investigations, and unsafe recommendations.

## Rollout Notes

Keep deterministic specialist behavior available for tests. Introduce model-backed specialists only after eval and grounding gates are stable.
