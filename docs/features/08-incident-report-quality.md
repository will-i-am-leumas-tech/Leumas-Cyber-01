# 08 - Incident Report Quality

## Purpose

Produce analyst-ready, executive-ready, and evidence-linked incident reports with version history and review workflow.

## Target Capability

- Generate multiple report types.
- Link claims to evidence references.
- Support edits, versions, review, and approval.
- Export reports in useful formats.
- Redact sensitive data for external audiences.

## Current State

- The MVP generates one Markdown report.
- Report sections are static.
- No versioning, approval, or redaction exists.

## Scope

- Report template system.
- Evidence citation model.
- Report versions.
- Redaction pass.
- Export-ready Markdown first.

## Non-Goals

- No legal advice.
- No automatic external notification without review.
- No unsupported claims in reports.

## Proposed Architecture

- `ReportTemplate`: id, audience, required sections, field rules.
- `ReportDraft`: caseId, templateId, content, citations, status.
- `ReportVersion`: draftId, version, editor, diffSummary, timestamp.
- `Citation`: claimId, sourceRef, observationId, confidence.
- `RedactionResult`: redactedFields, warnings, audience.

Suggested modules:

- `apps/api/src/reports/template-registry.ts`
- `apps/api/src/reports/report-draft-service.ts`
- `apps/api/src/reports/citation-validator.ts`
- `apps/api/src/reports/redaction-service.ts`
- `apps/api/src/routes/reports.ts`

## Data Model

Add:

- `reportTemplates[]`
- `reportDrafts[]`
- `reportVersions[]`
- `reportCitations[]`
- `redactionResults[]`

## API Changes

- `POST /cases/:id/reports`
- `GET /cases/:id/reports`
- `GET /cases/:id/reports/:reportId`
- `PATCH /cases/:id/reports/:reportId`
- `POST /cases/:id/reports/:reportId/redact`

## UI Changes

- Report template selector.
- Report editor.
- Citation side panel.
- Version history.
- Redaction preview.

## Scaffold Steps

1. Add report template schemas.
2. Convert current Markdown generator to template-based rendering.
3. Add citation validation against observations and findings.
4. Add version storage.
5. Add basic redaction for IPs, emails, usernames, and secrets.
6. Add UI report editor.

## Test Plan

- Unit: required report sections are enforced.
- Unit: citation validator rejects unknown evidence refs.
- Unit: redaction masks configured sensitive fields.
- Integration: create report draft, update it, create version.
- Regression: existing `/analyze` response still includes report markdown.

## Fixtures

- `data/fixtures/reports/executive-template.json`
- `data/fixtures/reports/technical-template.json`
- `data/fixtures/reports/report-with-missing-citation.json`

## Acceptance Criteria

- At least executive and technical report templates exist.
- Every key finding in a report can cite evidence.
- Report edits create versions.
- Redaction preview shows what changed.
- Reports remain exportable as Markdown.

