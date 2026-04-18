# 15 - SOC Analyst Experience V2

## Purpose

Upgrade the UI into a SOC-ready workspace for queues, evidence review, collaboration, approvals, explainable model output, and operational dashboards.

## Current Gap

The MVP workspace exists, but lacks case queue management, collaboration, advanced evidence graph controls, approval UX, model-quality visibility, and SOC operational dashboards.

## Target Operator Outcome

Analysts can triage, investigate, review evidence, approve safe actions, collaborate, and produce reports without needing direct API calls or hidden model reasoning.

## Safety Boundary

- Safety decisions, refusals, and safe redirects must be visible.
- High-impact actions must require explicit approval.
- Out-of-scope validation requests must be clearly denied.
- Sensitive values must be redacted in shared report and collaboration views.

## Proposed Architecture

- Case queue view model combines severity, priority, SLA, owner, state, and safety flags.
- Evidence graph view supports entities, relationships, filters, and source citations.
- Timeline view supports filtering, zoom, source reliability, and evidence links.
- Approval queue exposes action, validation, and sandbox approvals.
- Collaboration service supports notes, mentions, review status, and audit.
- Dashboards summarize model quality, safety decisions, provider health, and case flow.

## Expected File Changes

New files:

- `apps/web/src/pages/CaseQueuePage.tsx`
- `apps/web/src/pages/AdminDashboardPage.tsx`
- `apps/web/src/components/CaseQueue.tsx`
- `apps/web/src/components/EvidenceGraphControls.tsx`
- `apps/web/src/components/TimelineExplorer.tsx`
- `apps/web/src/components/CitationInspector.tsx`
- `apps/web/src/components/ApprovalQueue.tsx`
- `apps/web/src/components/AnalystNotes.tsx`
- `apps/web/src/components/ModelQualityDashboard.tsx`
- `apps/web/src/workspace/case-queue-view-model.ts`
- `apps/web/src/workspace/approval-view-model.ts`
- `apps/api/src/collaboration/analyst-note-service.ts`
- `apps/api/src/schemas/collaboration.schema.ts`
- `apps/api/src/routes/collaboration.ts`
- `tests/unit/soc-analyst-view-models.test.ts`
- `tests/unit/soc-analyst-components.test.ts`
- `tests/integration/collaboration-flow.test.ts`
- `docs/analyst-guide/soc-workspace.md`

Existing files to modify:

- `apps/web/src/App.tsx`: add queue and dashboard routes.
- `apps/web/src/api/client.ts`: add queue, notes, approvals, and dashboard methods.
- `apps/web/src/components/CaseWorkspacePage.tsx`: integrate citation, timeline, graph, notes, approvals.
- `apps/web/src/components/EntityGraph.tsx`: support filters and source links.
- `apps/web/src/components/WorkspaceTimeline.tsx`: support zoom and filters.
- `apps/web/src/components/ReportEditor.tsx`: include redaction and review status.
- `apps/api/src/routes/cases.ts`: add queue filters and summary fields.
- `apps/api/src/routes/actions.ts`: expose approval queue data.
- `apps/api/src/routes/providers.ts`: expose model quality dashboard data.
- `apps/api/src/schemas/case.schema.ts`: add notes and review metadata if not separate.

## Data Model Additions

- `CaseQueueItem`: case id, severity, priority, status, owner, SLA, flags, updatedAt.
- `AnalystNote`: case id, author, text, mentions, visibility, createdAt, audit ref.
- `ApprovalQueueItem`: action or validation id, risk, status, approver, dueAt.
- `DashboardMetric`: name, value, labels, time window.

## API Changes

- `GET /cases/queue`
- `POST /cases/:id/notes`
- `GET /cases/:id/notes`
- `GET /approvals`
- `GET /admin/dashboards/model-quality`

## UI Changes

- Case queue.
- Evidence graph controls.
- Timeline explorer.
- Citation inspector.
- Approval queue.
- Analyst notes.
- Model quality and safety dashboards.

## Milestones

- [x] Add case queue.
- [x] Add evidence graph controls.
- [x] Add timeline zoom and filtering.
- [x] Add citation inspection panel.
- [x] Add approval queue.
- [x] Add collaborative notes.
- [x] Add model-quality and safety dashboards.

## Acceptance Criteria

- Analysts can triage cases without direct API calls.
- Evidence support is visible for findings.
- High-impact actions require explicit approval.
- Safety refusals and redirects are understandable.
- Notes and approvals are audited.

## Test Plan

- Unit tests for queue, approval, graph, and timeline view models.
- Component tests for queue, graph, timeline, citations, approvals, and notes.
- Integration tests for collaboration and approval routes.
- End-to-end smoke tests for triage and approval workflows.

## Rollout Notes

Add queue and citations first; approvals and dashboards should follow after sandbox and provider quality data are available.
