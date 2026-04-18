# Frontier Cyber Agent Quality Gap Roadmap

This document outlines the features missing from the current Leumas Defensive Cyber Agent MVP to approach a frontier cyber-agent quality bar comparable to modern cyber-focused AI systems.

The model names and vendor positioning in the market can change quickly, so this roadmap does not claim exact parity with any specific external model. It defines a practical target: a robust, auditable, enterprise-grade cyber assistant capable of high-quality defensive operations and safe, authorized security validation.

Detailed scaffold-and-test outlines for each roadmap feature area live in [docs/features/README.md](./features/README.md).

## Safety Scope

The current product goal is defensive-only. Any future offensive-security capability must remain limited to authorized, controlled, auditable security validation.

Allowed future offensive-adjacent scope:

- Purple-team planning inside owned or explicitly authorized environments
- Detection validation using safe adversary-emulation frameworks
- Vulnerability verification through approved scanners and lab-safe checks
- Exploit-intelligence summarization without reproduction or weaponization
- Control validation, exposure assessment, and remediation planning
- CTF or training-lab workflows with synthetic targets

Still blocked:

- Malware creation or modification
- Ransomware logic
- Credential theft workflows
- Phishing kit creation
- Persistence or evasion instructions
- Lateral movement playbooks for real environments
- Weaponized payload generation
- Unauthorized target selection, recon, intrusion, or compromise guidance

## Current MVP Baseline

Implemented today:

- Local Fastify API with `/health`, `/analyze`, `/cases`, and case save routes
- React/Vite SOC dashboard
- Deterministic local mock provider
- Rule-based offensive request detector
- Basic alert and log triage heuristics
- Basic IOC normalization
- Simple hardening checklist adapter
- Timeline extraction from timestamped lines
- Markdown report generation
- Local JSON case and audit storage
- Unit and integration tests for core flows

Major limitation:

- The MVP is a structured workflow prototype, not yet a deep cyber reasoning system.

## 1. Model Quality And Cyber Reasoning

Missing:

- Strong cyber-specialized reasoning across endpoint, identity, cloud, network, and application security domains
- Multi-step investigation planning with assumptions, uncertainty, and evidence tracking
- Evidence-grounded answers that cite exact log lines, alert fields, and case artifacts
- Robust hypothesis generation and hypothesis pruning
- Confidence calibration based on data quality and corroborating signals
- Distinction between known facts, inferred facts, and analyst assumptions
- Ability to ask clarifying questions when evidence is insufficient
- Support for structured reasoning traces that are safe for audit without exposing hidden chain-of-thought
- Better reasoning about timelines, causality, blast radius, and containment priority
- Better handling of incomplete, noisy, contradictory, or adversarial inputs

Needed work:

- Add a model orchestration layer that combines deterministic parsing, retrieval, tool calls, and model output validation
- Add typed intermediate artifacts for hypotheses, entities, observations, evidence, and decisions
- Add result validators that reject unsupported conclusions
- Add confidence scoring based on explicit evidence coverage
- Add a human-review flow for high-impact recommendations

## 2. Cyber Knowledge Base And Retrieval

Missing:

- Curated defensive knowledge base
- Threat behavior mapping to MITRE ATT&CK and D3FEND
- Detection and response playbooks
- Cloud provider security references
- Windows, Linux, macOS, Kubernetes, SaaS, and identity hardening baselines
- Vulnerability and CVE context
- Internal runbooks and environment-specific context
- Vendor alert schema documentation
- Safe retrieval with source attribution and versioning

Needed work:

- Add retrieval-augmented generation with source citations
- Store source document versions and retrieval snapshots in the audit trail
- Add knowledge ingestion for Markdown, PDF, HTML, JSON, Sigma, YARA, ECS, OCSF, and STIX/TAXII feeds
- Add trust tiers for sources: internal runbooks, vendor docs, standards, threat intel, community content
- Add stale-source warnings and review dates

## 3. Data Ingestion And Normalization

Missing:

- Real parsers for common security formats
- Large-file chunking and streaming
- File hash calculation and metadata extraction
- Schema-aware normalization
- Entity resolution across hosts, users, IPs, cloud identities, containers, and processes
- Support for compressed archives and multi-file case bundles
- Safe handling of potentially malicious samples

Needed input support:

- Windows EVTX exports
- Sysmon logs
- Linux auth and audit logs
- Zeek logs
- Suricata and Snort alerts
- Firewall logs
- Proxy and DNS logs
- EDR and XDR exports
- CloudTrail, Azure Activity Logs, Entra ID logs, Google Cloud audit logs
- Kubernetes audit logs
- SaaS logs such as Okta, GitHub, Google Workspace, Microsoft 365, Slack
- SIEM exports from Splunk, Elastic, Sentinel, Chronicle, and QRadar

Needed work:

- Add OCSF/ECS-like internal event schema
- Add parser adapters with strict validation and parser confidence
- Add deduplication and correlation IDs
- Add chunk-level provenance so every conclusion can link back to source records
- Add upload scanning, file size limits, and safe file storage policies

## 4. Investigation Workflow Engine

Missing:

- Case workflow state machine
- Analyst task management
- Investigation plan generation
- Evidence collection checklist
- Timeline refinement loop
- Asset and identity scoping
- Containment decision support
- Escalation routing
- Collaborative analyst notes
- Case closure criteria

Needed work:

- Add case statuses: new, triaging, investigating, contained, remediating, monitoring, closed
- Add assigned analysts, due dates, priorities, and tags
- Add linked evidence and decision records
- Add chain-of-custody metadata for important artifacts
- Add case merge, split, and related-case detection
- Add executive and technical case views

## 5. Tool Integrations

Missing:

- SIEM query adapters
- EDR/XDR adapters
- Identity provider adapters
- Cloud security adapters
- Ticketing and messaging integrations
- Threat intelligence enrichment
- Sandbox and malware-analysis integrations for defensive analysis
- Vulnerability scanner integrations

Needed integrations:

- Splunk
- Elastic
- Microsoft Sentinel
- Google Chronicle
- CrowdStrike
- Microsoft Defender
- SentinelOne
- Microsoft Entra ID
- Okta
- AWS, Azure, and Google Cloud security APIs
- VirusTotal or equivalent reputation providers
- MISP, OpenCTI, STIX/TAXII
- Jira, ServiceNow, Linear, GitHub Issues
- Slack, Teams, email
- Tenable, Qualys, Rapid7, Wiz, Prisma, Lacework

Needed work:

- Add connector framework with credentials isolated from model prompts
- Add scoped permissions and per-tool allowlists
- Add dry-run mode for every state-changing tool
- Add approval gates for containment actions
- Log every query, tool call, result summary, and approval

## 6. Safe Autonomous Actions

Missing:

- Human-in-the-loop approval system
- Policy-driven action permissions
- Reversible containment workflows
- Dry-run previews
- Blast-radius checks before actions
- Action rollback metadata
- Rate limiting and change windows

Potential defensive actions:

- Create a ticket
- Open an incident channel
- Add a detection watchlist entry
- Request endpoint isolation through EDR
- Disable or reset a compromised account through identity tooling
- Add firewall or DNS block recommendation for review
- Trigger a vulnerability scan
- Collect forensic triage package

Needed work:

- Build action plans separate from execution
- Require explicit approval for high-risk actions
- Add role-based approval rules
- Add audit records for rejected, approved, failed, and completed actions
- Add environment policy checks before execution

## 7. Detection Engineering

Missing:

- Sigma rule generation and validation
- YARA rule generation and validation for defensive malware triage
- SIEM-specific query generation
- Detection test fixtures
- False-positive analysis
- Data-source coverage mapping
- ATT&CK technique coverage views
- Detection lifecycle tracking

Needed work:

- Add detection rule builder with strict schema validation
- Add rule test harness using known-good and known-bad fixture events
- Add backend translators for Splunk SPL, KQL, EQL, Lucene, and YARA where appropriate
- Add safe rule linting and simulation
- Add detection change review workflow
- Add suppression and tuning recommendations with justification

## 8. Incident Report Quality

Missing:

- Multiple report templates
- Evidence-linked report sections
- Executive narrative quality
- Regulatory and legal hold sections
- Customer or board-ready summaries
- Post-incident review format
- Export to PDF, DOCX, HTML, and ticket comments

Needed report types:

- Executive incident summary
- Technical investigation report
- Containment and eradication checklist
- Regulatory notification draft
- Customer communication draft
- Post-incident review
- Detection improvement report
- Control failure report

Needed work:

- Add report templates with required fields
- Add source-linked citations for every key finding
- Add reviewer and approver metadata
- Add versioned report history
- Add redaction support for sensitive data

## 9. Safety And Abuse Resistance

Missing:

- Policy engine beyond simple keyword matching
- Context-aware cyber safety classifier
- Safe transformation rules for dual-use content
- Jailbreak and prompt-injection resistance
- Tool-output sanitization
- Data exfiltration protections
- Model response validation for unsafe content
- Security review workflows for new tools and prompts

Needed work:

- Add layered safety checks before model call, before tool call, and before final response
- Add separate policies for defensive analysis, authorized validation, CTF/lab work, and blocked real-world misuse
- Add prompt-injection detection for uploaded logs, documents, and web content
- Add allowlisted tool schemas and denylisted action patterns
- Add refusal analytics and safety audit dashboards
- Add red-team test suite for harmful cyber requests

## 10. Authorized Offensive-Security Validation

This section describes missing features for legitimate security validation without enabling real-world misuse.

Missing:

- Explicit authorization model for environments, assets, and test windows
- Lab-only mode for CTF and training targets
- Purple-team campaign planning
- Control validation mapped to ATT&CK techniques
- Safe adversary-emulation integration
- Detection validation results and coverage scoring
- Rules that prevent live-target exploitation guidance or payload generation

Allowed future capabilities:

- Generate a purple-team test plan at the objective level
- Map defensive controls to emulated behaviors
- Recommend safe validation tools and required approvals
- Track whether expected telemetry appeared
- Produce detection gaps and remediation tasks
- Summarize exploit intelligence defensively without procedural reproduction

Needed work:

- Add asset authorization records
- Add scope boundaries and expiry dates
- Add campaign approval workflow
- Add safe emulation adapter support for controlled frameworks
- Add hard blocks for payload code, exploit chains, stealth, persistence, credential theft, and unauthorized targeting
- Add lab environment detector and warnings when scope is unclear

## 11. Vulnerability Management

Missing:

- CVE enrichment
- Asset exposure correlation
- Exploitability and business-impact scoring
- Patch prioritization
- Compensating control recommendations
- SLA and exception tracking

Needed work:

- Add vulnerability scanner ingestion
- Add EPSS, CVSS, KEV, vendor advisory, and asset criticality context
- Add internet exposure and privilege context
- Add remediation task generation
- Add exception workflow with expiry and approval
- Add trend dashboards for vulnerability risk

## 12. Cloud And Identity Security

Missing:

- Cloud posture analysis
- Identity risk analysis
- SaaS misconfiguration review
- Privilege escalation risk detection
- Conditional access and MFA analysis
- Service account and workload identity review

Needed work:

- Add AWS IAM, CloudTrail, GuardDuty, Security Hub, and Config adapters
- Add Azure Entra ID, Defender, Activity Logs, and Sentinel adapters
- Add Google Cloud IAM, audit logs, SCC, and Chronicle adapters
- Add Okta and Google Workspace identity adapters
- Add cloud attack-path style defensive graphing
- Add least-privilege recommendation engine

## 13. Endpoint And Forensics

Missing:

- Process tree reconstruction
- File, registry, network, and user-session correlation
- Memory, disk, and triage artifact indexing
- Malware static-analysis summaries
- Sandbox report ingestion
- Forensic timeline generation

Needed work:

- Add endpoint event schema
- Add parent-child process graph view
- Add artifact collection checklist
- Add safe sample handling and storage controls
- Add sandbox report parser
- Add forensic report templates

## 14. Threat Intelligence

Missing:

- IOC enrichment beyond local normalization
- Threat actor and malware-family context
- Campaign clustering
- Sighting history
- Confidence and source reliability scoring
- Indicator lifecycle management

Needed work:

- Add MISP/OpenCTI/STIX/TAXII support
- Add provider-specific enrichment adapters
- Add indicator expiration and revocation metadata
- Add internal sightings correlation
- Add threat intel source ranking
- Add analyst feedback loop for false positives

## 15. Multi-Agent Architecture

Missing:

- Specialized analyst agents
- Planner, parser, investigator, report writer, safety reviewer, and tool executor roles
- Task decomposition with state tracking
- Cross-agent consistency checks
- Agent output arbitration

Needed work:

- Add orchestrator service
- Add bounded agent roles with typed inputs and outputs
- Add shared case memory and immutable evidence store
- Add tool permission boundaries per role
- Add result review stage before analyst-facing output
- Add latency and cost controls

## 16. Evaluation Harness

Missing:

- Cyber-specific benchmark suite
- Regression tests for reasoning quality
- Golden datasets and expected reports
- Safety refusal benchmark
- Tool-use benchmark
- Human analyst scoring workflow
- Performance and latency benchmarks

Needed eval sets:

- Alert triage cases
- Log analysis cases
- IOC enrichment cases
- Incident report cases
- Hardening tasks
- Detection engineering tasks
- Cloud misconfiguration cases
- Identity compromise cases
- Prompt-injection cases
- Unsafe offensive request cases
- Authorized lab validation cases

Needed metrics:

- Correct severity
- Correct category and tactic mapping
- Evidence citation accuracy
- Recommendation usefulness
- False-positive and false-negative rates
- Unsafe compliance rate
- Refusal correctness
- Tool-call correctness
- Report completeness
- Analyst time saved

## 17. Auditability And Governance

Missing:

- Immutable audit log
- Prompt and tool-call versioning
- Model version tracking
- Policy version tracking
- Reviewer approvals
- Compliance export
- Retention policies

Needed work:

- Move audit logs from JSON files to append-only storage
- Add cryptographic integrity checks for critical audit entries
- Add prompt template version IDs
- Add model/provider version IDs
- Add policy decision records
- Add export for governance review
- Add retention and deletion workflows

## 18. Data Privacy And Security

Missing:

- Secret detection and redaction
- PII detection and redaction
- Tenant isolation
- Encryption at rest
- Encryption in transit
- Secure credential vaulting
- Data residency controls
- Prompt data minimization

Needed work:

- Add redaction layer before model calls
- Add secure storage adapter
- Add secrets manager integration
- Add per-tenant encryption keys
- Add access logs
- Add least-privilege service accounts
- Add secure deletion
- Add privacy-preserving telemetry

## 19. Enterprise Access Control

Missing:

- Authentication
- Role-based access control
- SSO and SCIM
- Case-level permissions
- Tool-level permissions
- Approval roles
- Break-glass access

Needed work:

- Add OIDC/SAML login
- Add roles: viewer, analyst, lead, responder, admin, auditor
- Add case ownership and team membership
- Add tool permission matrix
- Add approval policies for containment and external communication
- Add audit views for administrators and auditors

## 20. Storage And Scalability

Missing:

- Production database
- Search index
- Object storage for artifacts
- Background jobs
- Queueing
- Horizontal scaling
- Backup and restore

Needed work:

- Replace local JSON with PostgreSQL or SQLite-plus-migration path
- Add OpenSearch, Elasticsearch, or SQLite FTS for search
- Add object storage for large uploads
- Add job queue for enrichment and report generation
- Add migrations
- Add backup, restore, and retention controls
- Add deployment manifests

## 21. Observability And Reliability

Missing:

- Structured app metrics
- Distributed tracing
- Error tracking
- Health checks for providers and tools
- Job retry policies
- Dead-letter queues
- SLA dashboards

Needed work:

- Add OpenTelemetry
- Add metrics for latency, token usage, tool calls, refusal rates, and failed analyses
- Add provider fallback logic
- Add graceful degradation when external services are down
- Add synthetic checks for core flows
- Add operational runbooks

## 22. User Experience

Missing:

- Mature investigation workspace
- Rich evidence graph
- Process tree view
- IOC table with enrichment state
- Query builder
- Report editor
- Collaboration features
- Keyboard shortcuts
- Analyst feedback capture

Needed work:

- Add case graph and entity graph
- Add timeline filters and grouping
- Add side-by-side evidence and report editing
- Add comments and mentions
- Add task board
- Add saved views
- Add analyst feedback buttons for model quality improvement

## 23. Model Provider Maturity

Missing:

- Streaming responses
- Provider retries and fallback
- Cost and token accounting
- Structured output enforcement
- Provider-specific safety handling
- Local model packaging
- Evaluation by provider

Needed work:

- Add JSON schema constrained outputs where supported
- Add automatic repair for invalid structured responses
- Add provider health checks
- Add provider routing by task type
- Add local/offline operation profile
- Add model comparison dashboards

## 24. Secure Development Lifecycle

Missing:

- Security threat model
- Dependency policy
- Static analysis
- Secret scanning
- Container scanning
- Release signing
- Security test suite

Needed work:

- Add threat model for model, tool, storage, and UI layers
- Add CI for tests, typecheck, lint, audit, and build
- Add dependency update policy
- Add CodeQL or equivalent static analysis
- Add secret scanning
- Add container image scanning
- Add signed releases and SBOMs

## 25. Documentation And Operator Readiness

Missing:

- Admin guide
- Analyst guide
- Connector setup guide
- Safety policy guide
- Deployment guide
- Incident response examples
- API documentation

Needed work:

- Add OpenAPI spec
- Add local deployment guide
- Add production deployment guide
- Add connector credential setup docs
- Add safety and refusal examples
- Add sample case walkthroughs
- Add troubleshooting guide

## Suggested Delivery Phases

### Phase 1: Defensive MVP Hardening

- Replace JSON storage with a real database
- Add structured event schema
- Improve parsers and IOC extraction
- Add authentication
- Add stronger audit records
- Add better report templates
- Add safety regression tests

### Phase 2: SOC-Grade Assistant

- Add SIEM, EDR, identity, cloud, and ticketing connectors
- Add retrieval over internal runbooks and standards
- Add investigation workflow state
- Add evidence-linked reporting
- Add detection engineering support
- Add source-cited answers

### Phase 3: Enterprise Readiness

- Add RBAC, SSO, tenant isolation, encryption, and governance exports
- Add queueing, search, object storage, observability, and backups
- Add human approval gates for actions
- Add compliance and privacy controls
- Add production deployment patterns

### Phase 4: Frontier Cyber Reasoning

- Add multi-agent orchestration
- Add cyber evaluation harness
- Add calibrated confidence scoring
- Add hypothesis tracking
- Add advanced correlation across endpoint, identity, cloud, and network data
- Add benchmark-driven model/provider selection

### Phase 5: Safe Authorized Validation

- Add explicit authorization records
- Add lab and purple-team modes
- Add safe adversary-emulation planning
- Add detection validation workflows
- Add strict blocks against weaponization, stealth, persistence, credential theft, and unauthorized targeting
- Add approval and audit workflows for every validation campaign

## Top Priority Backlog

1. Add production database and migrations.
2. Add authentication and RBAC.
3. Add normalized event schema and parser framework.
4. Add evidence-linked conclusion model.
5. Add RAG with source attribution.
6. Add SIEM and EDR read-only connectors.
7. Add stronger safety classifier and safety eval suite.
8. Add detection engineering workflow.
9. Add immutable audit log.
10. Add model/provider structured output validation.
11. Add case workflow state machine.
12. Add enterprise report templates.
13. Add threat intelligence enrichment.
14. Add cloud and identity adapters.
15. Add evaluation harness with golden cyber cases.

## Quality Bar Definition

The system should not be considered frontier-quality until it can:

- Correctly triage realistic multi-source incidents
- Cite evidence for every major conclusion
- Maintain an auditable case history
- Avoid unsafe offensive guidance under adversarial prompting
- Integrate with real security tools safely
- Generate useful detection and remediation artifacts
- Handle ambiguous data with calibrated uncertainty
- Support analyst review and approval for impactful actions
- Demonstrate performance on repeatable cyber evals
- Operate securely in a production enterprise environment
