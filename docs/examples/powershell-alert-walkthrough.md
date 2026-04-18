# PowerShell Alert Walkthrough

This walkthrough uses [powershell-encoded.json](../../data/fixtures/alerts/powershell-encoded.json) to exercise a defensive alert triage flow.

## Objective

Create a case, review the reasoning, and capture recommended next steps for a suspicious encoded PowerShell alert.

## Run The API

Follow [local development](../getting-started/local-dev.md), then confirm health:

```bash
curl http://127.0.0.1:3001/health
```

## Submit The Fixture

The easiest path is to copy the fixture JSON into an alert request:

```bash
curl -X POST http://127.0.0.1:3001/analyze \
  -H 'content-type: application/json' \
  -d '{"mode":"alert","json":{"eventId":4688,"processName":"powershell.exe","commandLine":"powershell.exe -EncodedCommand SQBFAFgA"}}'
```

Expected result:

- A `caseId` is returned.
- The result includes a severity, confidence, evidence list, and recommended actions.
- The case stores reasoning artifacts and audit entries.

## Review The Case

Replace `CASE_ID` with the returned case identifier:

```bash
curl http://127.0.0.1:3001/cases/CASE_ID
```

Review:

- title and severity
- evidence observations
- recommended collection or containment actions
- timeline entries
- report markdown
- safety decisions

## Safety Review

This example is allowed because it analyzes existing defensive evidence. Do not turn the walkthrough into exploit development, evasion, persistence, credential theft, or unauthorized recon guidance. For boundary examples, review the [safety policy](../security/safety-policy.md).

## Analyst Handoff

Use the report draft as a starting point. Before sharing externally, verify citations, remove sensitive values, and confirm that every recommendation is tied to observed evidence.
