# 05 - Tool Integrations

## Purpose

Connect the agent to security tools so it can retrieve evidence, enrich indicators, create tickets, and prepare defensive actions under strict permissions.

## Target Capability

- Add read-only connector framework first.
- Support SIEM, EDR, identity, cloud, threat intel, and ticketing adapters.
- Keep credentials isolated from model prompts.
- Log every tool call and result summary.
- Provide dry-run behavior for state-changing tools.

## Current State

- No external tool integrations exist.
- Provider integrations are model-only.
- IOC enrichment is local and deterministic.

## Scope

- Connector interface.
- Credential reference model.
- Tool permission policy.
- Tool call audit log.
- Mock connector for tests.
- First read-only connector shape.

## Non-Goals

- No direct model access to secrets.
- No unrestricted shell or network tool execution.
- No state-changing containment actions without the safe actions framework.

## Proposed Architecture

- `Connector`: metadata, capabilities, healthCheck.
- `ToolCall`: connectorId, operation, parameters, actor, caseId.
- `ToolResult`: status, summary, records, sourceRefs, sensitiveFields.
- `ToolPolicy`: allowed operations, approval requirements, rate limits.
- `CredentialRef`: vault reference or env ref, never raw secret in case data.

Suggested modules:

- `apps/api/src/tools/connector-registry.ts`
- `apps/api/src/tools/tool-policy.ts`
- `apps/api/src/tools/tool-runner.ts`
- `apps/api/src/tools/connectors/mock-siem.connector.ts`
- `apps/api/src/routes/tools.ts`

## Data Model

Add:

- `connectors[]`: id, type, name, enabled, capabilities.
- `toolCalls[]`: id, caseId, connectorId, operation, paramsHash, status, timestamp.
- `toolResults[]`: id, toolCallId, summary, recordRefs, redactionStatus.

## API Changes

- `GET /tools/connectors`
- `POST /tools/:connectorId/health`
- `POST /cases/:id/tool-calls`
- `GET /cases/:id/tool-calls`

## UI Changes

- Connector status panel.
- Tool call timeline.
- Evidence import button.
- Dry-run preview for future write operations.

## Scaffold Steps

1. Define connector interface and tool schemas.
2. Add mock SIEM connector using local fixture records.
3. Add tool policy checks before execution.
4. Store tool call and result summaries.
5. Add route to run allowed read-only tool calls.
6. Render imported evidence in a case.

## Test Plan

- Unit: policy denies unknown connector operations.
- Unit: credential refs never serialize raw secret values.
- Integration: mock connector query imports evidence.
- Integration: tool calls are audited.
- Safety: model cannot directly invoke a tool without validated tool request schema.

## Fixtures

- `data/fixtures/tools/mock-siem-events.json`
- `data/fixtures/tools/denied-tool-call.json`

## Acceptance Criteria

- At least one read-only mock connector works end to end.
- Every tool call creates an audit entry.
- Tool parameters and results are validated by schema.
- Secrets are never stored in case data or prompts.
- Denied tool calls return structured policy errors.

