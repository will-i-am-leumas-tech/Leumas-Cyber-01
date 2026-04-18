# goal.md — Leumas Defensive Cyber Agent MVP

## 1) Project Title
**Leumas Defensive Cyber Agent**

A defensive-only cyber security assistant and workflow engine that helps blue teams analyze logs, summarize alerts, recommend hardening steps, classify suspicious activity, draft incident reports, and coordinate security tasks.

This project is inspired by the direction of modern cyber-focused AI systems such as Anthropic's Claude Mythos and OpenAI's GPT-5.4-Cyber, but this MVP must remain **strictly defensive**, **auditable**, and **safe by design**. It must **not** generate exploit chains, malware, credential theft flows, persistence mechanisms, or offensive intrusion steps.

---

## 2) Product Goal
Build a working MVP that can:

1. ingest defensive cyber inputs
2. analyze and normalize them
3. classify severity and likely category
4. propose defensive next steps
5. generate structured outputs for analysts
6. keep an audit trail of all actions and prompts
7. enforce safety boundaries against offensive use

This should feel like a lightweight SOC copilot for a solo operator or small team.

---

## 3) Core MVP Use Cases
The MVP must support these flows:

### A. Alert Triage
User pastes or uploads:
- security alert JSON
- Windows event logs
- auth logs
- firewall logs
- EDR-style findings
- suspicious PowerShell or shell command text

The system should:
- summarize what happened
- assign severity: low / medium / high / critical
- identify likely tactic category
- explain why it matters
- recommend defensive next actions
- generate a clean analyst report

### B. IOC / Indicator Review
User provides:
- IPs
- domains
- file hashes
- URLs
- registry keys
- process names

The system should:
- normalize indicators
- label them by type
- deduplicate them
- let the pipeline enrich them through adapters
- return a defensive explanation and recommended containment steps

### C. Log Summarization
User provides raw logs.
The system should:
- chunk logs
- extract key suspicious events
- build a timeline
- highlight anomalies
- produce a concise incident summary

### D. Hardening Assistant
User asks things like:
- how do I harden RDP?
- how do I secure IIS?
- how do I improve Windows logging?
- what should I enable for MFA?

The system should:
- return best-practice defensive guidance
- output step-by-step hardening checklists
- generate remediation tasks

### E. Incident Report Drafting
The system should produce:
- executive summary
- technical summary
- evidence list
- affected systems
- recommended remediation
- analyst notes
- follow-up checklist

---

## 4) Non-Goals / Safety Boundaries
This project must **refuse** or **block** the following:

- exploit development
- malware creation or modification
- ransomware logic
- phishing kit creation
- credential theft workflows
- persistence or evasion techniques
- post-exploitation playbooks
- lateral movement instructions
- weaponized payload generation
- real-world target selection or offensive recon guidance
- instructions for bypassing security controls unlawfully

If a request crosses these lines, the system must:
1. refuse clearly
2. explain that the agent is defensive-only
3. redirect into safe alternatives like detection, hardening, validation, sandbox analysis, or incident response

---

## 5) Product Principles

### Defensive by Default
All prompts, tools, and outputs must be framed for defense.

### Explainability
Every important conclusion should include:
- confidence
- reasoning summary
- evidence references

### Auditability
All actions must be logged.

### Modular / DRY
Every stage should be adapter-based and easy to swap.

### Local-First Friendly
The MVP should run locally with simple configuration.

### Model-Agnostic
The core app should work with:
- Ollama
- OpenAI-compatible endpoints
- mocked local model for tests

---

## 6) Suggested Stack
Use **Node.js + TypeScript** for the MVP.

### Backend
- Node.js
- TypeScript
- Express or Fastify
- Zod for schemas
- Pino for logs
- Vitest for tests

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS

### Storage
Start simple:
- local JSON files for cases and audit logs
- optional SQLite adapter later

### Model Layer
Abstract provider layer:
- `local-mock`
- `ollama`
- `openai-compatible`

### Optional Libraries
- `ipaddr.js` for IP validation
- `hash-wasm` or native validation helpers for hash checks
- `date-fns` for timeline formatting

---

## 7) High-Level Architecture

```text
User Input
  -> API Route
  -> Input Validator
  -> Normalizer
  -> Safety Guard
  -> Pipeline Router
      -> Log Analyzer Adapter
      -> IOC Enricher Adapter
      -> Hardening Advisor Adapter
      -> Report Generator Adapter
  -> Model Provider
  -> Structured Result Composer
  -> Case Storage + Audit Trail
  -> UI Response
```

---

## 8) Required Features

### 8.1 Case Workspace
Create a simple case system.
Each case should contain:
- case id
- title
- created at
- input type
- raw input reference
- normalized artifacts
- severity
- summary
- recommendations
- report markdown
- audit entries

### 8.2 Input Types
Support these inputs for MVP:
- pasted text
- pasted JSON
- uploaded `.log`, `.txt`, `.json`, `.csv`

### 8.3 Safety Guardrail Engine
Create a rule-based safety layer before any model call.
It should detect and block requests asking for:
- exploitation
- payload creation
- credential theft
- malware logic
- target compromise

It should return a structured refusal object:

```json
{
  "allowed": false,
  "reason": "offensive_request_detected",
  "safeRedirect": "I can help you analyze alerts, improve detections, harden systems, or draft an incident response plan instead."
}
```

### 8.4 Triage Pipeline
For suspicious events or alerts, output:

```json
{
  "title": "Suspicious PowerShell Execution",
  "severity": "high",
  "confidence": 0.82,
  "category": "execution",
  "summary": "PowerShell was used with encoded command behavior consistent with suspicious automation.",
  "evidence": [
    "Event ID 4688 shows powershell.exe execution",
    "Command line contains encoded payload-like structure"
  ],
  "recommendedActions": [
    "Isolate the host if unauthorized",
    "Collect parent-child process tree",
    "Review user account activity",
    "Search for similar executions across endpoints"
  ]
}
```

### 8.5 IOC Normalizer
Normalize and classify indicators:
- ipv4
- ipv6
- domain
- url
- md5
- sha1
- sha256
- hostname
- file path
- registry key

### 8.6 Timeline Builder
Given logs or alert entries, construct a simple ordered timeline.

### 8.7 Report Generator
Generate markdown reports with sections:
- Overview
- Severity
- Findings
- Timeline
- Indicators
- Recommended Actions
- Notes

### 8.8 Frontend Dashboard
Build a minimal but polished interface with:
- left sidebar: cases
- center: intake form / upload area
- right panel: result / report view
- tabs: Summary / Evidence / Timeline / Recommendations / Audit

Styling direction:
- dark
- minimal
- terminal-inspired
- high-tech defensive SOC look
- clean spacing, not cluttered

---

## 9) File Tree

```text
leumas-defensive-cyber-agent/
  goal.md
  package.json
  tsconfig.json
  .env.example
  README.md
  apps/
    web/
      index.html
      package.json
      src/
        main.tsx
        App.tsx
        api/client.ts
        components/
          CaseSidebar.tsx
          IntakePanel.tsx
          ResultTabs.tsx
          SeverityBadge.tsx
          TimelineView.tsx
          AuditView.tsx
        pages/
          DashboardPage.tsx
        types/
          index.ts
    api/
      package.json
      src/
        server.ts
        app.ts
        routes/
          health.ts
          analyze.ts
          cases.ts
        schemas/
          input.schema.ts
          case.schema.ts
          result.schema.ts
        services/
          case-service.ts
          audit-service.ts
          timeline-service.ts
          report-service.ts
        pipeline/
          analyze-pipeline.ts
          pipeline-router.ts
        providers/
          base-provider.ts
          mock-provider.ts
          ollama-provider.ts
          openai-compatible-provider.ts
        adapters/
          log-analyzer.adapter.ts
          ioc-normalizer.adapter.ts
          hardening-advisor.adapter.ts
          report-generator.adapter.ts
        guardrails/
          offensive-detector.ts
          refusal-builder.ts
        utils/
          hash.ts
          indicators.ts
          files.ts
          ids.ts
          time.ts
  data/
    cases/
    audits/
    fixtures/
      alerts/
      logs/
      iocs/
  tests/
    unit/
      offensive-detector.test.ts
      indicator-normalizer.test.ts
      timeline-service.test.ts
      report-service.test.ts
    integration/
      analyze-alert.test.ts
      analyze-log-upload.test.ts
      refusal-flow.test.ts
      hardening-flow.test.ts
```

---

## 10) API Endpoints

### `GET /health`
Returns service health.

### `POST /analyze`
Accepts:
- `mode`: `alert | logs | iocs | hardening`
- `text`
- `json`
- uploaded file

Returns structured result.

### `GET /cases`
Lists all saved cases.

### `GET /cases/:id`
Returns case details.

### `POST /cases/:id/save`
Persists current analysis.

---

## 11) Provider Contract
All AI providers must implement one shared interface.

```ts
export interface CyberModelProvider {
  name: string;
  analyze(input: {
    systemPrompt: string;
    userPrompt: string;
    context?: Record<string, unknown>;
  }): Promise<{
    text: string;
    structured?: Record<string, unknown>;
    raw?: unknown;
  }>;
}
```

The mock provider must be deterministic so tests pass without a remote model.

---

## 12) Safe System Prompt Requirements
The default system prompt must establish that the assistant:
- is a defensive cybersecurity assistant
- may analyze suspicious behavior
- may recommend containment and remediation
- may help with detection engineering
- may explain risks at a high level
- must refuse offensive or harmful requests
- must not provide exploit code or weaponization steps
- should produce structured JSON where required

---

## 13) Example MVP Flows

### Flow 1: Suspicious PowerShell Alert
Input:
- JSON alert with host name, command line, user, timestamp

Expected behavior:
- severity assigned
- suspicious encoded PowerShell highlighted
- recommendations for containment and triage
- report generated

### Flow 2: Failed Login Burst
Input:
- auth log text with repeated failed logins and one successful login

Expected behavior:
- identify brute-force pattern or credential stuffing suspicion
- build short timeline
- recommend account reset, MFA check, source review

### Flow 3: IOC Batch Review
Input:
- newline-separated IPs, domains, hashes

Expected behavior:
- classify indicators
- dedupe them
- produce clean structured table
- recommend block / monitor / investigate actions

### Flow 4: Hardening Request
Input:
- “How do I harden IIS on a Windows Server?”

Expected behavior:
- return defensive checklist
- no offensive or bypass content
- give prioritized steps

### Flow 5: Malicious Request Refusal
Input:
- request for malware, persistence, credential theft, or exploit chain

Expected behavior:
- blocked before provider call
- structured refusal returned
- audit entry created

---

## 14) Test Fixtures To Include
Create sample fixture files:

### `data/fixtures/alerts/powershell-encoded.json`
A suspicious PowerShell execution alert.

### `data/fixtures/logs/auth-bruteforce.log`
A burst of failed logins followed by one successful login.

### `data/fixtures/logs/windows-process.log`
A small process creation log with suspicious child process patterns.

### `data/fixtures/iocs/sample-iocs.txt`
A mixed list of IPs, domains, URLs, SHA256 hashes, and duplicate values.

### `data/fixtures/alerts/benign-admin-task.json`
A normal admin automation event for low-risk comparison.

---

## 15) Required Tests

### Unit Tests

#### `offensive-detector.test.ts`
Must verify:
- exploit requests are blocked
- malware requests are blocked
- credential theft requests are blocked
- benign hardening requests are allowed
- detection engineering requests are allowed

#### `indicator-normalizer.test.ts`
Must verify:
- valid IPs detected
- domains detected
- URLs detected
- hashes detected
- duplicates removed
- invalid junk safely ignored or flagged

#### `timeline-service.test.ts`
Must verify:
- timestamps are sorted
- missing timestamps do not crash the service

#### `report-service.test.ts`
Must verify:
- markdown report renders expected sections

### Integration Tests

#### `analyze-alert.test.ts`
Send suspicious alert fixture and verify:
- 200 response
- severity exists
- summary exists
- recommendations array exists

#### `analyze-log-upload.test.ts`
Submit log fixture and verify:
- timeline returned
- suspicious pattern extracted

#### `refusal-flow.test.ts`
Submit offensive request and verify:
- refusal object returned
- provider was not called
- audit entry written

#### `hardening-flow.test.ts`
Submit IIS hardening prompt and verify:
- safe result returned
- includes checklist items
- no refusal

---

## 16) Audit Log Requirements
Every request must create an audit record with:
- request id
- timestamp
- route
- mode
- allowed or blocked
- provider used
- case id if created
- summary of outcome

Do not log secrets if present. Redact obvious credentials or tokens.

---

## 17) Success Criteria For MVP
The MVP is complete when:

1. frontend can submit text, JSON, or files
2. backend can analyze all four modes: alert / logs / iocs / hardening
3. cases can be saved and reopened
4. reports generate in markdown
5. mock provider allows deterministic tests
6. offensive requests are reliably blocked before provider execution
7. all required tests pass
8. README explains setup and local run steps clearly

---

## 18) Nice-To-Have After MVP
Do not build these unless MVP is done first:
- Sigma/YARA rule suggestion in defensive-only mode
- SIEM connectors
- VirusTotal-style adapter hooks
- MITRE ATT&CK mapping
- analyst feedback / case notes
- SQLite or Postgres storage
- real authentication
- multi-user tenancy
- PDF export
- diff view for repeated alerts

---

## 19) README Requirements
README must include:
- what the project is
- strict defensive-only scope
- quick start
- environment variables
- how to run API and web app
- how to run tests
- example curl requests
- example screenshots or sample output blocks

---

## 20) Environment Variables
Create `.env.example` with:

```env
PORT=4010
WEB_ORIGIN=http://localhost:5173
MODEL_PROVIDER=mock
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_COMPAT_BASE_URL=
OPENAI_COMPAT_API_KEY=
DATA_DIR=./data
```

---

## 21) Codex Build Order
Build in this order:

1. root workspace and package setup
2. shared schemas and types
3. backend health route
4. guardrail engine
5. mock provider
6. indicator normalizer
7. timeline service
8. report generator
9. analyze route and pipeline router
10. file-based case storage
11. frontend dashboard
12. integration tests
13. README polish

Do not skip tests.
Do not over-engineer.
Keep functions small, typed, and modular.

---

## 22) Coding Rules
- use TypeScript everywhere possible
- keep files focused and small
- prefer pure functions for analyzers
- no giant god files
- DRY reusable services and adapters
- validate all inputs with schemas
- fail safely
- make output deterministic where tests depend on it

---

## 23) Final Instruction To Codex
Scaffold the full MVP now.
Implement the backend, frontend, test fixtures, tests, README, and minimal styling.
Use placeholder deterministic logic where a live model is not available.
Do not add offensive features.
Do not leave TODO stubs for core MVP behavior.
Return code that runs locally and passes tests.
