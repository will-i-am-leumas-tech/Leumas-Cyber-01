# Knowledge Governance

Curated knowledge keeps model guidance tied to approved defensive sources. Treat the local knowledge store as an evidence source: every document needs an owner, tenant scope, trust tier, review date, approval state, and citation quality checks.

## Source Registry

Use the registry endpoint to review the metadata that controls retrieval:

```bash
curl -s http://127.0.0.1:3001/knowledge/source-records
```

Registry records include:

- `owner`: team accountable for correctness and review.
- `tenantId`: tenant boundary for retrieval. Use `global` only for sources approved for all tenants.
- `trustTier`: `internal`, `standard`, `vendor`, or `community`.
- `approvalState`: `approved`, `draft`, `rejected`, `retired`, or `quarantined`.
- `reviewAt`: date used by freshness scoring and stale-source warnings.
- `taxonomyTags`: framework references such as ATT&CK, D3FEND, CWE, CAPEC, or CVE identifiers.

## Ingestion

Ingest only defensive sources that support investigation, detection, hardening, response, or authorized validation.

```bash
curl -s http://127.0.0.1:3001/knowledge/sources \
  -H "content-type: application/json" \
  -d '{
    "title": "Windows Logging Baseline",
    "text": "# Windows Logging Baseline\n\nEnable process creation, PowerShell, and authentication telemetry.",
    "uri": "local://knowledge/windows-logging",
    "type": "markdown",
    "trustTier": "internal",
    "owner": "security-platform",
    "tenantId": "tenant_default",
    "approvalState": "approved",
    "taxonomyTags": ["T1110"],
    "version": "2026.1",
    "reviewAt": "2027-01-01T00:00:00.000Z"
  }'
```

Content that matches unsafe knowledge signals is quarantined during ingestion and excluded from default search. Do not approve or retrieve instructions for credential theft, stealth, evasion, malware operation, or unauthorized compromise.

## Approval

Review state changes with:

```bash
curl -s -X PATCH http://127.0.0.1:3001/knowledge/sources/source_id/approval \
  -H "content-type: application/json" \
  -d '{
    "reviewer": "security-lead",
    "status": "approved",
    "reason": "Reviewed against current defensive baseline."
  }'
```

Quarantined sources remain quarantined until the unsafe content is removed and re-ingested. Retired or rejected sources are excluded from default retrieval.

## Retrieval

Default retrieval returns approved sources in the active tenant:

```bash
curl -s http://127.0.0.1:3001/knowledge/search/hybrid \
  -H "content-type: application/json" \
  -d '{
    "query": "Windows failed login monitoring",
    "limit": 3,
    "filters": {
      "tenantId": "tenant_default"
    }
  }'
```

Use explicit filters for source ids, trust tiers, tenant id, or approval states. Do not include quarantined or retired sources in model prompts except for administrative review workflows.

## Citation Quality

Each retrieval result includes citation quality with:

- `relevance`: how closely the chunk matched the query.
- `freshness`: review-date health.
- `trust`: trust-tier score.
- `warnings`: stale or lower-trust warnings that must be shown to analysts.

Cases store citation quality records so reviewers can audit which source chunks influenced the response.

## Freshness And Taxonomy

Check source freshness:

```bash
curl -s http://127.0.0.1:3001/knowledge/sources/source_id/freshness
```

Check taxonomy mappings:

```bash
curl -s http://127.0.0.1:3001/knowledge/sources/source_id/taxonomy
```

Use stale warnings as a review queue. Update the source, replace it with a current baseline, or retire it when it is no longer reliable.

## Release Checks

Before enabling a new knowledge collection:

- Verify tenant isolation with a search from another tenant.
- Confirm unsafe content is quarantined.
- Confirm stale sources produce warnings.
- Confirm citations include source title, location, trust tier, version, and quality scores.
- Run `npm test -- tests/unit/curated-knowledge-base.test.ts tests/integration/knowledge-governance-flow.test.ts tests/evals/knowledge-grounding.test.ts`.
