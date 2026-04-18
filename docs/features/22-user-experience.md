# 22 - User Experience

## Purpose

Improve the analyst dashboard from a simple MVP into a practical investigation workspace with stable layouts, evidence navigation, case workflow, and review tools.

## Target Capability

- Support fast triage with clear case status.
- Show evidence, findings, entities, timelines, process trees, detections, and reports in context.
- Let analysts review assumptions and confidence.
- Support comments, tasks, and collaboration.
- Keep the interface accessible and layout-stable.

## Current State

- Implemented in the MVP on 2026-04-17.
- Dashboard supports a hash-addressable case workspace at `#/cases/:caseId`.
- Intake remains available as a separate flow and selected cases open into the workspace.
- Workspace includes overview, evidence, timeline, workflow, report, and deep-data sections.
- Evidence inspector links findings to observations, source locators, excerpts, entities, and normalized events.
- Entity graph summarizes event, entity, indicator, and finding relationships without requiring canvas rendering.
- Workflow task board is wired to audited task create/update routes.
- Report editor is wired to audited report create/update/redaction routes.
- Safety decisions and recent audit entries remain visible in the workspace rail.

## Scope

- Case workspace layout.
- Evidence navigation.
- Task and workflow surfaces.
- Report editor.
- Entity and timeline views.
- Accessibility and responsive quality.

## Non-Goals

- No decorative UI work that does not improve analyst workflow.
- No hiding safety decisions.
- No UI-only state for data that must be audited.

## Proposed Architecture

- `CaseWorkspaceState`: active tab, selected entity, selected finding, filters.
- `EvidenceViewModel`: findings, observations, source refs, citations.
- `TimelineFilter`: entity, event type, severity, time range.
- `TaskViewModel`: task status, owner, priority.
- `Comment`: author, body, linked resource, timestamp.

Suggested modules:

- `apps/web/src/pages/CaseWorkspacePage.tsx`
- `apps/web/src/components/EvidencePanel.tsx`
- `apps/web/src/components/EntityGraph.tsx`
- `apps/web/src/components/TaskBoard.tsx`
- `apps/web/src/components/ReportEditor.tsx`

## Data Model

Depends on backend feature models:

- Observations and findings.
- Entities and normalized events.
- Tasks and decisions.
- Reports and comments.

## API Changes

No UI-only API changes.

Consumed existing audited backend routes:

- `POST /cases/:id/tasks`
- `PATCH /cases/:id/tasks/:taskId`
- `POST /cases/:id/state`
- `POST /cases/:id/reports`
- `PATCH /cases/:id/reports/:reportId`
- `POST /cases/:id/reports/:reportId/redact`

Potential later additions:

- `POST /cases/:id/comments`
- `GET /cases/:id/workspace`

## UI Changes

- Case workspace route.
- Evidence inspector.
- Entity and process graph views.
- Timeline filters.
- Task board.
- Report editor.
- Safety and audit panels always accessible.

## Scaffold Steps

1. Add a case workspace route separate from intake.
2. Add typed API client methods per feature.
3. Add evidence inspector component.
4. Add task board once workflow backend exists.
5. Add report editor once report backend exists.
6. Add responsive and accessibility checks.

## Test Plan

- Unit: components render empty, loading, error, and populated states.
- Unit: long text does not overflow fixed panels.
- Integration: dashboard loads cases and selected workspace.
- UI: Playwright smoke test for desktop and mobile layouts.
- Accessibility: labels and keyboard navigation for tabs and forms.

## Fixtures

- `apps/web/src/test-fixtures/case-workspace.json`
- `apps/web/src/test-fixtures/long-indicators.json`

## Acceptance Criteria

- Analyst can navigate from case list to full workspace.
- Evidence references are clickable within the UI.
- Layout remains stable with long indicators and reports.
- Safety and audit state are visible.
- UI tests cover core paths.

## MVP Verification

- `npm test -- tests/unit/web-workspace-view-model.test.ts tests/unit/web-workspace-components.test.ts`: 2 files, 8 tests passed.
- `npm run typecheck`: API and web TypeScript passed.
- `npm run build`: API TypeScript and web production build passed.
- `npm run evals`: 6/6 eval cases passed with average score 1.000; scorecard written to `tmp/eval-scorecard.json`.
- `npm test`: 53 files, 121 tests passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
