# Local Development

Use this guide to run the MVP locally with deterministic defaults. The local mock provider is the default, so no external model key is required for tests or first-run validation.

## Prerequisites

- Node 20 or newer is recommended.
- Node 18.19 has been used in this workspace, but some dependencies declare a Node 20 engine.
- A shell with `npm` available.

## Install And Verify

From the repository root:

```bash
npm install
npm test
npm run build
```

Before opening a change for review, run the local release gate:

```bash
npm run ci:verify
```

The release gate runs linting, documentation checks, typecheck, secret scanning, safety evals, tests, build, and dependency audit.

## Run The App

Start the API and web app in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

Default local URLs:

- API: `http://127.0.0.1:3001`
- Web: `http://127.0.0.1:5173`
- OpenAPI JSON: `http://127.0.0.1:3001/docs/openapi.json`

## Smoke Test

Check the API process:

```bash
curl http://127.0.0.1:3001/health
```

Run a defensive log analysis:

```bash
curl -X POST http://127.0.0.1:3001/analyze \
  -H 'content-type: application/json' \
  -d '{"mode":"logs","text":"2026-04-16T10:00:00Z failed login user=admin src=203.0.113.10"}'
```

Evaluate a safety decision before sending text into an analysis flow:

```bash
curl -X POST http://127.0.0.1:3001/safety/evaluate \
  -H 'content-type: application/json' \
  -d '{"mode":"alert","text":"Triage this suspicious PowerShell alert and recommend defensive containment."}'
```

## Data Locations

Local runtime data is written under the configured data directory. In normal development, use fixtures under `data/fixtures` and avoid copying real customer data into the repository.

## Next Steps

- Follow the [analyst triage workflow](../analyst-guide/triage-workflow.md) for the first investigation.
- Review the [configuration guide](../admin-guide/configuration.md) before changing providers or auth.
- Review the [safety policy](../security/safety-policy.md) before adding examples or workflows.
