# Feature Outline Index

This directory breaks the frontier cyber-agent roadmap into one outline file per feature area. Each file is written so the feature can be scaffolded, tested, reviewed, and shipped independently.

Use each outline as an implementation packet:

1. Read the target capability and safety boundaries.
2. Create the smallest useful scaffold.
3. Add unit tests for pure logic.
4. Add integration tests for API, storage, and tool boundaries.
5. Add UI tests or screenshots when the feature changes the analyst workflow.
6. Update the acceptance criteria as implementation details become concrete.

## Feature Outlines

1. [Model Quality And Cyber Reasoning](./01-model-quality-and-cyber-reasoning.md)
2. [Cyber Knowledge Base And Retrieval](./02-cyber-knowledge-base-and-retrieval.md)
3. [Data Ingestion And Normalization](./03-data-ingestion-and-normalization.md)
4. [Investigation Workflow Engine](./04-investigation-workflow-engine.md)
5. [Tool Integrations](./05-tool-integrations.md)
6. [Safe Autonomous Actions](./06-safe-autonomous-actions.md)
7. [Detection Engineering](./07-detection-engineering.md)
8. [Incident Report Quality](./08-incident-report-quality.md)
9. [Safety And Abuse Resistance](./09-safety-and-abuse-resistance.md)
10. [Authorized Offensive Security Validation](./10-authorized-offensive-security-validation.md)
11. [Vulnerability Management](./11-vulnerability-management.md)
12. [Cloud And Identity Security](./12-cloud-and-identity-security.md)
13. [Endpoint And Forensics](./13-endpoint-and-forensics.md)
14. [Threat Intelligence](./14-threat-intelligence.md)
15. [Multi-Agent Architecture](./15-multi-agent-architecture.md)
16. [Evaluation Harness](./16-evaluation-harness.md)
17. [Auditability And Governance](./17-auditability-and-governance.md)
18. [Data Privacy And Security](./18-data-privacy-and-security.md)
19. [Enterprise Access Control](./19-enterprise-access-control.md)
20. [Storage And Scalability](./20-storage-and-scalability.md)
21. [Observability And Reliability](./21-observability-and-reliability.md)
22. [User Experience](./22-user-experience.md)
23. [Model Provider Maturity](./23-model-provider-maturity.md)
24. [Secure Development Lifecycle](./24-secure-development-lifecycle.md)
25. [Documentation And Operator Readiness](./25-documentation-and-operator-readiness.md)

## Baseline Test Rule

Every feature should add at least:

- One unit test for its core deterministic logic.
- One integration test for the API or service boundary.
- One safety or permission test when the feature touches model output, external tools, sensitive data, or dual-use cyber workflows.
- One fixture that future regressions can reuse.

