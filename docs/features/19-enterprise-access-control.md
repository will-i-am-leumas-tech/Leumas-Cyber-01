# 19 - Enterprise Access Control

## Purpose

Add authentication, role-based authorization, case permissions, tool permissions, and approval roles for enterprise use.

## Target Capability

- Authenticate users through local dev auth first, then OIDC/SAML.
- Enforce roles and permissions.
- Restrict cases by team or assignment.
- Gate tool calls and actions by role.
- Support auditor and admin views.

## Current State

- Implemented in the MVP on 2026-04-17.
- Local dev authentication can be enabled with `authRequired: true` in `createApp` or `AUTH_REQUIRED=true`.
- Routes remain open by default for local development and existing tests.
- Role matrix, case membership checks, dev login, current-user, and case member routes are available.
- Protected case membership writes add actor metadata to audit entries.

## Scope

- User and role schema.
- Session or token middleware.
- Permission checks.
- Case membership.
- Approval role model.

## Non-Goals

- No production SSO in first scaffold.
- No bypass permissions without audit.
- No shared admin secrets in code.

## Proposed Architecture

- `User`: id, email, displayName, status.
- `Role`: viewer, analyst, lead, responder, admin, auditor.
- `Permission`: resource, action, condition.
- `CaseMembership`: caseId, userId, role, teamId.
- `AuthContext`: user, roles, permissions, request ID.

Suggested modules:

- `apps/api/src/auth/auth-context.ts`
- `apps/api/src/auth/dev-auth-middleware.ts`
- `apps/api/src/auth/permission-service.ts`
- `apps/api/src/auth/case-access-service.ts`
- `apps/api/src/routes/auth.ts`

## Data Model

Add:

- `users[]`
- `roles[]`
- `permissions[]`
- `teams[]`
- `caseMemberships[]`

## API Changes

- `GET /auth/me`
- `POST /auth/dev-login`
- Permission middleware for all case routes.
- `POST /cases/:id/members`
- `GET /cases/:id/members`

## UI Changes

- Current user display.
- Access denied state.
- Case member management.
- Approval role indicators.

## Scaffold Steps

1. Add auth schemas.
2. Add local dev auth header middleware.
3. Add permission service with role matrix.
4. Protect case routes.
5. Add actor IDs to audit events.
6. Add UI state for current user and denied access.

## Test Plan

- Unit: role matrix grants and denies expected actions.
- Unit: case membership restricts access.
- Integration: unauthenticated request is rejected when auth is enabled.
- Integration: analyst can read assigned case but not admin routes.
- Security: audit records include actor ID for protected actions.

## Fixtures

- `data/fixtures/auth/users.json`
- `data/fixtures/auth/role-matrix.json`
- `data/fixtures/auth/case-memberships.json`

## Acceptance Criteria

- Routes can run in local dev mode with explicit test users.
- Case access is enforced.
- Tool/action permissions can be checked by role.
- Audit entries include actor metadata.
- Tests cover allowed and denied paths.

## MVP Verification

- `npm test -- tests/unit/auth-permission-service.test.ts tests/integration/auth-flow.test.ts`: 2 files, 3 tests passed.
- `npm run typecheck`: API and web TypeScript passed.
- `npm run evals`: 6/6 eval cases passed with average score 1.000; scorecard written to `tmp/eval-scorecard.json`.
- `npm test`: 45 files, 100 tests passed.
- `npm run build`: API TypeScript and web production build passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
