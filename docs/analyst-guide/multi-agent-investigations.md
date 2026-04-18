# Multi-Agent Investigations

Multi-agent investigations run bounded specialist agents against a case and store reviewable outputs, traces, memory, arbitration, reviewer findings, and operator overrides.

## Start An Investigation

```http
POST /cases/{id}/agents/investigate
```

The response includes:

- Specialist tasks and results.
- Trace records with input refs, output refs, tool refs, policy decisions, duration, and status.
- Case-scoped memory items built only from evidence-backed findings and sandbox runs.
- Reviewer findings for grounding, safety, and completeness.
- Arbitration results with selected output, conflicts, rationale, and evidence IDs.

## Role Contracts

```http
GET /agents/roles
```

Each role contract declares allowed tasks, required evidence, output schema, budget, and safety requirements. Agents inherit safety, authorization, tool sandbox, and tenant boundaries.

## Trace Review

```http
GET /cases/{id}/agents/traces
```

Use traces to verify what each specialist saw and produced. A trace should never contain raw credentials or unapproved tool execution. Tool activity must point to sandboxed runs.

## Arbitration

```http
POST /cases/{id}/agents/arbitrate
```

Arbitration resolves conflicts by selecting validated, evidence-backed results. If any specialist fails validation or the reviewer blocks output, the result requires operator review.

## Operator Overrides

```http
POST /cases/{id}/agents/overrides
```

Overrides capture actor, decision, reason, and affected finding IDs. Use overrides to approve, reject, or request changes after reviewing traces and arbitration rationale.

## Safety Boundary

Agents cannot execute high-impact actions, bypass sandbox policy, ignore tenant boundaries, or promote unsupported findings. Unsafe or ungrounded recommendations must be blocked or marked for review.
