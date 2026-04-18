# Runbook: Provider Down

Use this runbook when analysis requests fail because the active model provider is unavailable, misconfigured, or returning unsafe or malformed output.

## Symptoms

- `/providers/health` reports an unhealthy active provider.
- `/analyze` responses fall back to refusal, error, or degraded behavior.
- Error records reference provider failures after sanitization.
- Evaluation or integration tests fail only when a non-mock provider is selected.

## Immediate Checks

1. Confirm the API is running:

```bash
curl http://127.0.0.1:3001/health
```

2. Check provider status:

```bash
curl http://127.0.0.1:3001/providers/health
```

3. Confirm the active provider configuration in the environment.
4. If using a remote provider, confirm network access and credential availability outside the repository.
5. If using a local provider, confirm the local model server is running.

## Stabilize

- Switch to `local-mock` for deterministic tests and demos.
- Re-run `npm run evals` to confirm safety and response quality gates.
- Re-run `npm test` if a provider change touched route or pipeline behavior.
- Preserve sanitized error records for the incident notes.

## Escalate

Escalate to the maintainer when:

- provider health remains unhealthy after configuration is corrected
- structured output validation repeatedly fails
- safety output validation blocks responses from a newly configured model
- usage accounting or provider routing appears inconsistent

## Prevent Recurrence

- Keep provider changes behind tests.
- Add a fixture for any new provider failure mode.
- Update the [configuration guide](../admin-guide/configuration.md) when adding provider environment variables.
- Update the [OpenAPI document](../api/openapi.yaml) if provider routes change.
