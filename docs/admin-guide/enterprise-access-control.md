# Enterprise Access Control

Enterprise access control adds tenant-aware authorization, service accounts, break-glass review, and explainable access decisions while keeping local dev auth available for tests.

## Core Concepts

- Tenants isolate cases, evidence, connectors, service accounts, and access decisions.
- Users carry tenant IDs, roles, groups, and attributes.
- Route guards evaluate RBAC, case membership, tenant boundaries, scoped service accounts, and active break-glass grants.
- Every guarded request can produce an access decision with subject, resource, action, result, reason, and policy version.

## Dev Auth Bridge

Local development still uses:

```http
POST /auth/dev-login
```

Responses include tenant IDs, attributes, groups, roles, and permissions. Requests use the returned `x-dev-user` header. When `AUTH_REQUIRED=true`, guarded routes require an active user and a matching policy decision.

## Current User Summary

```http
GET /auth/me
```

The response includes:

- `tenantIds`
- `activeTenantId`
- `roles`
- `permissions`
- `attributes`
- `scopes`
- `activeBreakGlassTenantIds`

Use this endpoint to explain why a user can or cannot reach a case or admin workflow.

## Tenants

```http
GET /admin/tenants
```

Admins can list configured tenants and verify tenant status, data policy, and retention policy. Suspended tenants should not be used for new evidence workflows.

## Service Accounts

```http
POST /admin/service-accounts
```

Service accounts require:

- `tenantId`
- `name`
- `owner`
- `scopes`
- `expiresAt`

The API returns a one-time issued credential and stores only a hash. Scopes should be narrow, such as `case:read` or `audit:read`, and every account must expire.

## Break-Glass

Request emergency access:

```http
POST /admin/break-glass
```

Review the request:

```http
POST /admin/break-glass/{id}/review
```

Approved grants are tenant-scoped, time-bound, audited, and visible in `/auth/me`. Use break-glass only for emergency response, handoff, or recovery workflows with a clear reason.

## Access Decisions

```http
GET /admin/access-decisions
```

Access decisions record the subject, tenant, resource, action, result, reason, policy version, and timestamp. Use this endpoint for audit review and denied-access troubleshooting.

## Safety Boundary

Access control must prevent unauthorized evidence viewing, connector use, tool execution, action approval, validation campaigns, provider use, and governance export. Do not bypass tenant boundaries outside a reviewed break-glass workflow.
