# Real Security Connectors

Connector v2 adds a read-only connector framework for security evidence retrieval. The first implementation is fixture-backed so the policy, audit, and case-import behavior can be tested without live credentials.

## Current Connectors

- `sentinel-fixture`: Microsoft Sentinel-style alert records.
- `defender-fixture`: Microsoft Defender-style endpoint records.
- `entra-fixture`: Microsoft Entra ID-style sign-in records.
- `aws-security-fixture`: AWS security finding records.

## List And Health

```bash
curl http://127.0.0.1:3001/connectors
curl http://127.0.0.1:3001/connectors/health
```

## Query A Connector

```bash
curl -X POST http://127.0.0.1:3001/connectors/entra-fixture/query \
  -H 'content-type: application/json' \
  -d '{"operation":"search_signins","query":"203.0.113.10","limit":2,"actor":"analyst@example.test"}'
```

Queries are read-only. Write-like or unsupported operations are denied by connector policy and audited.

## Import Evidence To A Case

```bash
curl -X POST http://127.0.0.1:3001/cases/CASE_ID/connectors/entra-fixture/import \
  -H 'content-type: application/json' \
  -d '{"operation":"search_signins","query":"203.0.113.10","limit":2,"actor":"analyst@example.test"}'
```

The import stores connector evidence references on the case with source, external id, retrieval time, hash, data class, and audit metadata. Raw connector credentials are never stored in the case.

## Safety Boundary

Connector v2 is read-only in this stage. Do not add containment, account changes, blocking, deletion, quarantine, or other write operations until the tool sandbox, approval workflow, and governance controls are stronger.
