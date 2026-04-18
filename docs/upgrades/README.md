# Frontier Cyber Upgrade Roadmap

This folder tracks the missing capabilities needed to move the current MVP from a defensive cyber-agent scaffold toward a frontier-grade cyber operations platform. Each upgrade has its own implementation outline so work can be scaffolded, tested, and checked off one area at a time.

## Safety Position

The offensive side of this roadmap is limited to authorized validation, purple-team simulation, control testing, and lab-scoped verification. Do not implement features that enable unauthorized compromise, malware, credential theft, stealth, persistence, evasion, exploit chaining against real targets, or real-world target abuse.

## Upgrade Index

- [ ] [01 - Frontier Model Layer](./01-frontier-model-layer.md)
- [ ] [02 - Cyber Reasoning Engine](./02-cyber-reasoning-engine.md)
- [ ] [03 - Real Security Connectors](./03-real-security-connectors.md)
- [ ] [04 - Live Evidence Ingestion](./04-live-evidence-ingestion.md)
- [ ] [05 - Detection Engineering V2](./05-detection-engineering-v2.md)
- [ ] [06 - Authorized Validation Lab](./06-authorized-validation-lab.md)
- [ ] [07 - Vulnerability Management V2](./07-vulnerability-management-v2.md)
- [ ] [08 - Malware And Forensics Defensive Analysis](./08-malware-and-forensics-defensive-analysis.md)
- [x] [09 - Threat Intelligence Platform](./09-threat-intelligence-platform.md)
- [x] [10 - Enterprise Access Control V2](./10-enterprise-access-control-v2.md)
- [x] [11 - Expanded Evaluation Harness](./11-expanded-evaluation-harness.md)
- [x] [12 - Tool Execution Sandbox](./12-tool-execution-sandbox.md)
- [x] [13 - Multi-Agent Reliability V2](./13-multi-agent-reliability-v2.md)
- [x] [14 - Curated Knowledge Base](./14-curated-knowledge-base.md)
- [x] [15 - SOC Analyst Experience V2](./15-soc-analyst-experience-v2.md)
- [ ] [16 - Production Operations](./16-production-operations.md)
- [ ] [17 - Scalable Storage And Search](./17-scalable-storage-and-search.md)
- [ ] [18 - Governance And Compliance](./18-governance-and-compliance.md)

## Suggested Build Order

1. Expand evals first so future upgrades have a quality gate.
2. Add the provider/model quality harness.
3. Replace mock integrations with real read-only connectors.
4. Add scalable storage and evidence ingestion.
5. Improve reasoning, correlation, detection engineering, and analyst UX.
6. Add authorized validation only after scope controls, sandboxing, approvals, and audit are stronger.

## Cross-Cutting Done Criteria

- [ ] Every upgrade has unit tests for deterministic logic.
- [ ] Every API or connector change has integration tests.
- [ ] Every model-facing feature has eval coverage.
- [ ] Every external tool path has safety policy, permissions, audit, and redaction.
- [ ] Every operator workflow has documentation and troubleshooting notes.
- [ ] Every dual-use feature is explicitly scoped to authorized defensive or validation use.
- [ ] `npm run ci:verify` passes after each completed upgrade.
