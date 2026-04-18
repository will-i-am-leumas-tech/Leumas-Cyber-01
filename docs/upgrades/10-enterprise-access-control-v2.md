# 10 - Enterprise Access Control V2

## Purpose

Replace development auth with enterprise-grade identity, authorization, tenant isolation, service accounts, break-glass controls, and audit review.

## Current Gap

The MVP has dev auth and role fixtures. It does not yet support SSO, tenant isolation, service accounts, scoped API tokens, break-glass workflows, or consistent policy enforcement across every route and tool.

## Target Operator Outcome

Admins can connect enterprise identity, assign roles and attributes, enforce tenant and case boundaries, issue scoped service accounts, review privileged access, and prove access decisions through audit records.

## Safety Boundary

Access control must prevent unauthorized evidence viewing, model provider use, connector queries, tool execution, action approval, validation campaigns, and governance exports.

## Proposed Architecture

- Identity provider adapter supports OIDC first, with SAML later.
- Tenant service scopes users, cases, connectors, providers, knowledge, and evidence.
- Authorization policy engine combines RBAC, ABAC, case membership, and action context.
- Service account service issues scoped tokens with expiry and audit.
- Break-glass service grants time-bound emergency access with reason and review.
- Route guard middleware enforces permissions consistently.

## Expected File Changes

New files:

- `apps/api/src/auth/tenant-service.ts`
- `apps/api/src/auth/oidc-auth-provider.ts`
- `apps/api/src/auth/authorization-policy-engine.ts`
- `apps/api/src/auth/service-account-service.ts`
- `apps/api/src/auth/break-glass-service.ts`
- `apps/api/src/auth/route-permission-map.ts`
- `apps/api/src/schemas/auth-v2.schema.ts`
- `apps/api/src/routes/admin-access.ts`
- `data/fixtures/auth/tenants.json`
- `data/fixtures/auth/service-accounts.json`
- `data/fixtures/auth/break-glass-request.json`
- `tests/unit/access-control-v2.test.ts`
- `tests/integration/access-control-v2-flow.test.ts`
- `tests/security/cross-tenant-access.test.ts`
- `docs/admin-guide/enterprise-access-control.md`

Existing files to modify:

- `apps/api/src/auth/auth-service.ts`: support identity provider claims and tenants.
- `apps/api/src/auth/dev-auth-middleware.ts`: bridge dev users into tenant-aware context.
- `apps/api/src/auth/permission-service.ts`: delegate to policy engine.
- `apps/api/src/auth/case-access-service.ts`: enforce tenant and membership checks.
- `apps/api/src/auth/auth-context.ts`: include tenant, attributes, service account, and break-glass state.
- `apps/api/src/routes/auth.ts`: add login metadata and user access summary.
- `apps/api/src/routes/cases.ts`: enforce tenant and case access consistently.
- `apps/api/src/routes/tools.ts`: enforce tool permissions.
- `apps/api/src/routes/validation.ts`: enforce validation scope permissions.
- `apps/api/src/schemas/case.schema.ts`: add tenant id and access metadata.
- `docs/api/openapi.yaml`: document admin access endpoints.

## Data Model Additions

- `Tenant`: id, name, status, data policy, retention policy.
- `IdentityPrincipal`: user id, tenant ids, roles, attributes, groups.
- `ServiceAccount`: id, tenant id, scopes, token hash, expiresAt, owner.
- `BreakGlassGrant`: user id, tenant id, reason, approver, expiresAt, review status.
- `AccessDecision`: subject, action, resource, allowed, reason, policy version.

## API Changes

- `GET /auth/me`: include tenant, roles, attributes, scopes, and active grants.
- `POST /admin/service-accounts`
- `POST /admin/break-glass`
- `POST /admin/break-glass/:id/review`
- `GET /admin/access-decisions`

## UI Changes

- Admin tenant and role management.
- Service account management.
- Break-glass request and review workflow.
- Access denied explanations for analysts.

## Milestones

- [x] Add tenant model.
- [x] Add OIDC provider integration.
- [x] Add RBAC and ABAC policy engine.
- [x] Add case membership enforcement everywhere.
- [x] Add service account model.
- [x] Add break-glass workflow.
- [x] Add admin audit review screens and exports.

## Acceptance Criteria

- Users only see cases and tools they are allowed to access.
- Service accounts have scoped permissions and expiry.
- Break-glass access is time-bound, reviewed, and audited.
- Tenant data cannot cross boundaries.
- Permission failures are structured and explainable.

## Test Plan

- Unit tests for policy decisions and route permission maps.
- Integration tests for SSO claims, service accounts, break-glass, and denied cross-tenant access.
- Security tests for tool, connector, provider, and validation authorization.

## Rollout Notes

Add tenant ids and permission checks before live enterprise SSO. Keep dev auth available for local tests.
