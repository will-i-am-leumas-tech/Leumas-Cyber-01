# Analyst Triage Workflow

This workflow uses the deterministic local provider and the sample alert fixture at [powershell-encoded.json](../../data/fixtures/alerts/powershell-encoded.json).

## Goal

Turn a suspicious alert into a reviewed case with evidence, severity, recommended actions, and safety context.

## Steps

1. Start the API and web app using the [local development guide](../getting-started/local-dev.md).
2. Open the web app at `http://127.0.0.1:5173`.
3. Submit the PowerShell alert fixture as an alert analysis, or use the API example in the walkthrough.
4. Review the generated case title, severity, summary, evidence, indicators, and recommended actions.
5. Check the case workspace for task status, timeline entries, and report draft content.
6. Review the safety evidence if the request or model output was flagged.
7. Convert the recommendations into analyst-owned tasks before taking action in another system.

## Analyst Review Checklist

- The input is defensive and authorized.
- The summary cites observable evidence, not unsupported assumptions.
- Severity and confidence match the evidence quality.
- Recommendations are containment, collection, hardening, or detection actions.
- Any high-impact action is routed through approval and dry-run controls.
- The final report has enough context for a handoff without exposing secrets.

## Safe Follow-Up Prompts

- "Summarize the evidence that supports the high severity rating."
- "List additional logs to collect before containment."
- "Draft a detection idea for this behavior using the observed process fields."
- "Create a concise executive summary with no sensitive values."

## Unsafe Follow-Up Prompts

Do not ask the system for exploit chains, credential theft, malware, persistence, evasion, unauthorized recon, or target compromise instructions. Use the [safety policy](../security/safety-policy.md) for safe redirects.

## Full Example

See the [PowerShell alert walkthrough](../examples/powershell-alert-walkthrough.md) for an API-first version of this workflow.
