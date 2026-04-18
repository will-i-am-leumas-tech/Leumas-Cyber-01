# SOC Workspace

The SOC workspace gives analysts a queue-first workflow for triage, investigation, collaboration, approval review, citations, and model-quality visibility.

## Navigation

Use the workspace navigation:

- `#/` opens intake and case workspace.
- `#/queue` opens the SOC case queue.
- `#/admin` opens operational dashboards and approvals.
- `#/cases/{caseId}` opens a case workspace directly.

## Case Queue

The queue is backed by `GET /cases/queue`. Each item includes severity, priority, state, owner, SLA status, open tasks, pending approvals, notes, safety decision count, and flags.

Important flags:

- `approval_pending`: an action approval is waiting for review.
- `safety_blocked`: a safety decision blocked part of the case.
- `prompt_injection`: submitted evidence matched prompt-injection patterns.
- `stale_knowledge`: cited knowledge is past review.
- `grounding_review`: a model-facing claim needs analyst review.
- `overdue_task`: an open task is past due.

Use queue filters to focus on urgent open work before opening a case.

## Evidence

The evidence tab combines normalized evidence, source-linked observations, the citation inspector, and the entity graph.

The citation inspector shows:

- Source title and location.
- Trust tier and version.
- Relevance, freshness, and trust scores when available.
- Stale or lower-trust warnings.

The graph controls filter by text and node type so analysts can narrow the graph to entities, events, indicators, or findings.

## Timeline

The timeline explorer supports text filtering and zoom controls for all events, latest 20, or latest 5. Use this to focus review on the most recent evidence without losing the original event list.

## Workflow And Approvals

The workflow tab shows task lanes and case-scoped approvals. The global approval queue is available at `GET /approvals` and in the admin dashboard.

High-impact actions still require explicit lead approval before execution. The UI displays pending approvals but does not bypass policy enforcement.

## Collaboration Notes

Use `POST /cases/{id}/notes` to add an analyst note. Notes are audited and sensitive values are redacted before storage. Mentions are stored as metadata for routing and review.

Use `GET /cases/{id}/notes` to list notes for a case.

## Model Quality Dashboard

The admin dashboard uses `GET /admin/dashboards/model-quality`. It summarizes provider health, provider usage, safety-blocked cases, open cases, and grounding review counts.

Treat a perfect eval score as a checked synthetic score, not broad correctness. Review citation quality, grounding findings, and safety decisions before approving high-impact work.

## Verification

Run the SOC workspace checks:

```bash
npm test -- tests/integration/collaboration-flow.test.ts tests/unit/soc-analyst-view-models.test.ts tests/unit/soc-analyst-components.test.ts
```

Run the full gate before release:

```bash
npm run ci:verify
```
