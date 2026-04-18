# Security Threat Model

## Scope

This threat model covers the local-first Leumas Defensive Cyber Agent MVP: API, web UI, model providers, tool connectors, local storage, audit trail, privacy layer, and CI/security workflows.

## Assets

- Case evidence, uploaded artifacts, normalized events, and analyst reports.
- Audit entries, governance exports, approval records, and provider-call metadata.
- Model prompts, redacted prompt packages, provider outputs, and safety decisions.
- Connector configuration, action plans, and tool execution results.
- Local JSON storage under `data/` and generated runtime artifacts under `tmp/`.

## Trust Boundaries

- Browser to API boundary: user-controlled input enters through React forms and API routes.
- API to model boundary: prompts may leave the process when non-local providers are configured.
- API to tool boundary: connectors can query or act on external systems and must enforce policy.
- API to sandbox boundary: tool manifests, egress policy, resource limits, approvals, and artifact capture wrap tool execution.
- API to storage boundary: case data and audit logs are persisted locally and may contain sensitive evidence.
- CI boundary: pull requests run verification against untrusted code changes before merge.

## Primary Threats And Mitigations

| Threat | Boundary | Mitigation |
| --- | --- | --- |
| Offensive or dual-use request | Browser/API/model | Input guardrails, output safety validation, refusal audit records, safety evals. |
| Prompt injection in evidence | Browser/API/model | Prompt-injection detector, redacted prompt package records, source-linked audit metadata. |
| Secret exposure in prompts or logs | API/model/storage | Privacy scanning, prompt minimization, redacted artifacts, secret scan in CI. |
| Unsafe tool action | API/tool/sandbox | Tool manifests, egress policy, resource limits, approval workflow, dry-run support, artifact hashes, action audit trail. |
| Secret leakage through tool output | Sandbox/storage | Sandbox artifact redaction, output-size limits, hashes, and redaction-status metadata. |
| Tampered audit evidence | API/storage | Hash-chained audit events and governance export verification. |
| Provider outage or unsafe output | API/model | Provider failure fallback, output validator, provider health and usage records. |
| Dependency compromise | CI/runtime | `npm ci`, `npm audit --omit=dev`, SBOM generation, dependency policy. |

## Required Review Triggers

- Adding or changing a tool connector requires updating this threat model, reviewing action policy, and adding or updating a sandbox manifest.
- Adding a model provider requires documenting data egress, capabilities, health checks, and failure behavior.
- Adding storage backends requires documenting encryption, retention, backup, and audit-integrity behavior.
- Changing safety policy requires running `npm run evals` and documenting any changed refusal behavior.

## Residual Risk

- The MVP stores data locally as JSON and does not claim production-grade encryption-at-rest.
- The local secret scanner is pattern-based and should be supplemented by hosted scanning in production.
- Provider token estimates are approximate until provider-native usage accounting is available.
