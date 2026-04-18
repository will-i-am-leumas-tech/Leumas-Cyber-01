# Operator Documentation

This documentation set is the operating packet for the Leumas Defensive Cyber Agent MVP. It is organized by role so a developer, analyst, admin, or operator can find the steps they need without reading the whole roadmap.

## Start Here

- [Local development](./getting-started/local-dev.md) explains install, verification, and local server startup.
- [Analyst triage workflow](./analyst-guide/triage-workflow.md) walks through a sample alert investigation.
- [Reasoning review](./analyst-guide/reasoning-review.md) explains hypothesis, contradiction, unknown, and technique review.
- [Detection engineering](./analyst-guide/detection-engineering.md) explains rule validation, corpus testing, false-positive simulation, deployment records, and coverage.
- [Authorized validation](./analyst-guide/authorized-validation.md) explains signed scopes, lab-only campaigns, benign replay, and evidence reports.
- [Vulnerability management](./analyst-guide/vulnerability-management.md) explains scanner deltas, enrichment, risk scoring, SLA tracking, exceptions, and remediation validation.
- [Malware and forensics](./analyst-guide/malware-forensics.md) explains safe static triage, sandbox report parsing, YARA explanation, IOC extraction, and collection planning.
- [Threat intelligence](./analyst-guide/threat-intelligence.md) explains source management, STIX/MISP import, graph review, retro-hunts, and intel-to-detection handoff.
- [Multi-agent investigations](./analyst-guide/multi-agent-investigations.md) explains specialist roles, traces, arbitration, reviewer findings, and operator overrides.
- [SOC workspace](./analyst-guide/soc-workspace.md) explains queue triage, citations, graph controls, timeline filtering, approvals, notes, and model-quality dashboards.
- [Configuration guide](./admin-guide/configuration.md) explains provider, auth, data, and safety settings.
- [Enterprise access control](./admin-guide/enterprise-access-control.md) explains tenants, service accounts, break-glass, and access-decision review.
- [Evaluation harness](./admin-guide/evaluation-harness.md) explains eval domains, graders, thresholds, provider comparison, and trend review.
- [Evidence ingestion](./admin-guide/evidence-ingestion.md) explains source registration, ingestion jobs, custody, deduplication, and case linking.
- [Knowledge governance](./admin-guide/knowledge-governance.md) explains source approval, tenant-scoped retrieval, freshness, taxonomy mappings, and citation quality.
- [OpenAPI scaffold](./api/openapi.yaml) documents the supported MVP API surface.
- [Connector guide](./connectors/local-connectors.md) explains the current local mock connector pattern.
- [Real security connectors](./connectors/real-connectors.md) explains read-only connector v2 evidence retrieval and case import.
- [Safety policy](./security/safety-policy.md) documents allowed, blocked, and ambiguous request handling.
- [Provider down runbook](./runbooks/provider-down.md) gives operator steps for provider failures.
- [Tool sandbox failure runbook](./runbooks/tool-sandbox-failure.md) explains denied, approval-required, timed-out, and artifact-related sandbox runs.
- [PowerShell alert walkthrough](./examples/powershell-alert-walkthrough.md) is an end-to-end example using a fixture.
- [Frontier cyber upgrade roadmap](./upgrades/README.md) tracks the missing capabilities needed beyond the MVP, with one checklist file per upgrade.

## Verification

Run the documentation checker after changing docs or endpoint examples:

```bash
npm run docs:check
```

The checker validates required documentation files, local markdown links, core setup commands, OpenAPI path coverage, and safety examples.

## Safety Boundary

Documentation must stay defensive. Do not add instructions that enable exploitation, credential theft, malware, evasion, persistence, unauthorized recon, or target compromise. Use safe redirects that move ambiguous requests toward detection, hardening, validation in an authorized lab, or incident response.
