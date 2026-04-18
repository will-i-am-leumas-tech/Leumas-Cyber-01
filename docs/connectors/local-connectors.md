# Local Connector Guide

The MVP includes local connector scaffolding for defensive workflows. Connectors are intentionally bounded by policy checks, audit events, and deterministic fixtures.

## Current Connectors

- Mock SIEM query connector for case-linked event lookup.
- No-op action connector for dry-run and approved execution tests.
- Local evidence and fixture ingestion for repeatable development.

## Operator Rules

- Connectors must only support authorized defensive operations.
- Every connector call must be policy checked before execution.
- Tool calls must write audit entries with the requested operation, actor context, and result status.
- High-impact actions must require approval and should expose a dry-run path.
- Fixtures must not contain real secrets, customer identifiers, or live infrastructure details.

## Adding A Connector

1. Define the connector operation and expected defensive outcome.
2. Add policy rules for allowed, denied, and approval-required cases.
3. Add deterministic fixtures under `data/fixtures`.
4. Add unit tests for the policy and connector logic.
5. Add an integration test that verifies route behavior, audit records, and case updates.
6. Update the [threat model](../security/threat-model.md) and [safety policy](../security/safety-policy.md).

## Useful Fixtures

- [mock-siem-events.json](../../data/fixtures/tools/mock-siem-events.json)
- [denied-tool-call.json](../../data/fixtures/tools/denied-tool-call.json)
- [mock-approved-action.json](../../data/fixtures/actions/mock-approved-action.json)

## Failure Handling

Connector failures should return structured errors and preserve enough context for troubleshooting without logging secrets. Provider failures are covered in the [provider down runbook](../runbooks/provider-down.md).
