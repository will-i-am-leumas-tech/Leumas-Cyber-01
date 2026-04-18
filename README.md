# Leumas Defensive Cyber Agent

Local-first MVP for defensive security triage, IOC normalization, log summarization, hardening guidance, incident report drafting, case storage, and audit logging.

The system is intentionally defensive-only. A rule-based guardrail runs before model provider calls and blocks requests for exploit development, malware, credential theft, persistence, evasion, offensive recon, or target compromise guidance.

## Quick Start

Node 20+ is recommended. The project has been verified on Node 18.19 in this workspace, but the patched Fastify 5 router dependency declares a Node 20+ engine.

```bash
npm install
npm test
npm run build
npm run dev:api
npm run dev:web
```

Default local URLs:

- API: `http://127.0.0.1:3001`
- Web: `http://127.0.0.1:5173`

## Useful API Calls

```bash
curl http://127.0.0.1:3001/health
curl -X POST http://127.0.0.1:3001/analyze \
  -H 'content-type: application/json' \
  -d '{"mode":"logs","text":"2026-04-16T10:00:00Z failed login user=admin src=203.0.113.10"}'
```

## Project Layout

```text
apps/api   Fastify API, guardrails, adapters, providers, storage services
apps/web   React/Vite dashboard
data       Local cases, audit trail, and sample fixtures
tests      Unit and integration coverage for the MVP flows
```

## Provider Model

The default provider is `local-mock`, which is deterministic and used by tests. The API includes provider classes for Ollama and OpenAI-compatible endpoints so the application can be wired to remote or local models later without changing the pipeline contract.

## Safety Boundary

Allowed:

- alert triage
- defensive log analysis
- IOC review
- hardening guidance
- detection and response planning
- incident report drafting

Blocked:

- exploit chains
- malware or ransomware logic
- phishing kits
- credential theft workflows
- persistence or evasion instructions
- lateral movement playbooks
- real-world offensive recon guidance
