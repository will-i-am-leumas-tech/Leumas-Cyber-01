# Admin Configuration

This guide describes configuration points for local and controlled deployments of the MVP. It does not claim a production hardening certification.

## Provider Selection

The default provider is `local-mock`. It is deterministic and should remain the default for tests, demos, and offline validation.

For provider quality checks, fallback behavior, prompt versions, and comparison reports, see [model provider quality](./model-providers.md).

Provider environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `MODEL_PROVIDER` | Selects the provider implementation. | `local-mock` |
| `OPENAI_COMPATIBLE_BASE_URL` | Base URL for an OpenAI-compatible chat completions endpoint. | `https://api.openai.com/v1` |
| `OPENAI_COMPATIBLE_API_KEY` | API key for the OpenAI-compatible provider. | unset |
| `OPENAI_COMPATIBLE_MODEL` | Model name for the OpenAI-compatible provider. | `gpt-5.4` |
| `OLLAMA_BASE_URL` | Base URL for a local Ollama server. | provider default |
| `OLLAMA_MODEL` | Ollama model name. | provider default |

Keep provider credentials outside the repository. Do not place real keys in docs, fixtures, tests, or committed environment files.

## Auth

Development auth can be required with:

```bash
AUTH_REQUIRED=true npm run dev:api
```

The dev auth fixtures live under `data/fixtures/auth`. They are examples for local testing, not an enterprise identity provider replacement.

## Data Directory

Runtime state is stored through the local JSON storage adapter. Use a disposable data directory for tests and demos. Do not point development runs at customer evidence unless the environment has an approved data handling process.

## Safety Controls

Safety policy evaluation runs before provider execution for analysis requests. Output safety validation also blocks unsafe model responses before final report composition. Review the [safety policy](../security/safety-policy.md) before changing prompts, providers, or tool connectors.

## Connector Configuration

The current connector implementation is local and mock-backed. See the [connector guide](../connectors/local-connectors.md) for operator expectations and test fixtures.

## Operational Checks

- `npm run docs:check` validates documentation structure and links.
- `npm run security:scan` validates that committed content has no unapproved secret findings.
- `npm run security:sbom` writes a CycloneDX SBOM to `tmp/sbom.json`.
- `npm run ci:verify` runs the full local release gate.

## Troubleshooting

If the active provider fails or health degrades, use the [provider down runbook](../runbooks/provider-down.md).
