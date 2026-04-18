# Evidence Ingestion

The evidence ingestion layer registers defensive evidence sources, runs fixture-backed batch ingestion jobs, normalizes records, records deduplication state, and attaches custody metadata before evidence is linked to a case.

## Safety Boundary

- Use ingestion for authorized defensive evidence only.
- Do not store source credentials, tokens, or secrets in source names, case summaries, or job payloads.
- Treat raw payloads as sensitive. The API classifies ingested evidence and records sensitive finding ids before evidence can be linked to a case.
- The current implementation is fixture-backed and synchronous. It does not poll live systems or perform write operations against security tools.

## Source Registration

Register a source before starting an ingestion job:

```bash
curl -sS http://127.0.0.1:3001/ingestion/sources \
  -H 'content-type: application/json' \
  -d '{
    "name": "SOC DNS fixture",
    "type": "dns",
    "owner": "soc",
    "retentionClass": "standard",
    "dataClass": "internal"
  }'
```

Supported MVP source types are `dns`, `proxy`, `email_security`, `siem`, `edr`, `identity`, `cloud`, and `artifact`. Parser defaults are selected from the source type, with `dns-parser`, `proxy-parser`, and `email_security-parser` implemented in this slice.

## Job Execution

Start an ingestion job with `text` or `json` evidence:

```bash
curl -sS http://127.0.0.1:3001/ingestion/jobs \
  -H 'content-type: application/json' \
  -d '{
    "sourceId": "evidence_source_example",
    "actor": "analyst@example.test",
    "text": "2026-04-16T09:12:01Z query client_ip=10.10.4.21 domain=login.contoso.example qtype=A response_ip=203.0.113.10 action=allowed"
  }'
```

The response includes the job record, normalized evidence records, parser warnings, custody entries, sensitive findings, and deduplication records. Use `GET /ingestion/jobs/{id}` to retrieve the same status later.

## Case Linking

Link ingested evidence to a case by evidence id:

```bash
curl -sS http://127.0.0.1:3001/cases/case_example/evidence/import \
  -H 'content-type: application/json' \
  -d '{
    "evidenceIds": ["evidence_example"],
    "actor": "analyst@example.test",
    "note": "Attach DNS evidence to the triage case."
  }'
```

The case receives `evidenceRecords`, `chainOfCustodyEntries`, and the current deduplication index. The case result also receives the normalized events so existing case event views continue to work.

## Custody And Deduplication

Each evidence record receives custody entries for:

- `retrieved`
- `parsed`
- `deduplicated`
- `classified`
- `case_linked` when attached to a case

Deduplication fingerprints are computed from normalized event fields and raw excerpts. Duplicate records remain visible, but they are marked with `duplicate: true` and `duplicateOf` points back to the first observed evidence id.

## Fixture Inputs

Deterministic test fixtures live in:

- `data/fixtures/ingestion/dns-events.log`
- `data/fixtures/ingestion/proxy-events.log`
- `data/fixtures/ingestion/email-security-alert.json`

Use these fixtures when validating parser behavior, duplicate handling, and case-link custody.
