# 09 - Safety And Abuse Resistance

## Purpose

Upgrade safety from keyword detection to layered policy enforcement across user input, retrieved content, model output, tool calls, and final responses.

## Target Capability

- Classify cyber requests by allowed defensive, authorized validation, lab, ambiguous, or blocked categories.
- Detect prompt injection in uploaded content and retrieved documents.
- Validate model output for unsafe content.
- Enforce tool permissions before execution.
- Keep refusal and safety decision records.

## Current State

- A rule-based detector blocks obvious harmful requests.
- Safety runs before provider calls only.
- No output or tool-call safety validation exists.

## Scope

- Layered safety policy engine.
- Safety decision schema.
- Prompt-injection detector.
- Output validator.
- Safety regression test suite.

## Non-Goals

- No silent execution of ambiguous dual-use requests.
- No bypass for admin users without policy audit.
- No storage of raw harmful instructions in prompts or reports beyond sanitized evidence handling.

## Proposed Architecture

- `SafetyDecision`: allowed, category, reason, matchedSignals, safeRedirect, policyVersion.
- `SafetyContext`: case, mode, user role, authorization records, target environment.
- `PromptInjectionFinding`: sourceRef, pattern, risk, mitigation.
- `OutputSafetyResult`: allowed, blockedSegments, repairedOutput, reason.
- `ToolSafetyResult`: allowed operation and approval requirement.

Suggested modules:

- `apps/api/src/safety/policy-engine.ts`
- `apps/api/src/safety/input-classifier.ts`
- `apps/api/src/safety/prompt-injection-detector.ts`
- `apps/api/src/safety/output-validator.ts`
- `apps/api/src/safety/safety-audit-service.ts`

## Data Model

Add:

- `safetyDecisions[]`
- `policyVersions[]`
- `promptInjectionFindings[]`
- `outputSafetyResults[]`

## API Changes

- Extend `/analyze` response with safety decision details.
- `GET /cases/:id/safety`
- `POST /safety/evaluate` for test harness and admin debugging.

## UI Changes

- Safety decision panel.
- Prompt-injection warnings.
- Refusal reason and safe redirection display.
- Admin safety analytics later.

## Scaffold Steps

1. Replace current detector return type with versioned safety decision.
2. Add categories for defensive, authorized validation, lab, ambiguous, and blocked.
3. Add prompt-injection scanning for uploaded text.
4. Add output validation before report composition.
5. Add policy version in audit entries.
6. Expand safety test fixtures.

## Test Plan

- Unit: harmful requests are blocked.
- Unit: defensive analysis of harmful artifacts is allowed with evidence handling.
- Unit: ambiguous real-world validation asks for scope clarification.
- Unit: prompt injection in a log line is flagged but not followed.
- Integration: unsafe provider output is blocked before final response.

## Fixtures

- `data/fixtures/safety/blocked-malware-request.txt`
- `data/fixtures/safety/defensive-artifact-with-payload-terms.log`
- `data/fixtures/safety/prompt-injection-log.log`
- `data/fixtures/safety/ambiguous-validation-request.txt`

## Acceptance Criteria

- Safety decisions are versioned and audited.
- Unsafe output cannot reach final report or tool execution.
- Prompt injection in input is visible to analysts.
- Regression suite covers allowed, blocked, and ambiguous cases.
- Refusals redirect to safe defensive alternatives.

