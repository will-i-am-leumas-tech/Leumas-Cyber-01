# Threat Intelligence

The threat intelligence platform turns trusted intel into defensive triage context, graph evidence, read-only retro-hunts, and detection intents. Start with file-based STIX or MISP imports before connecting live sources.

## Supported Workflows

- Register an intel source with owner, trust score, update cadence, retention, and enabled state.
- Import STIX bundles or MISP events from trusted defensive feeds.
- Review normalized indicators, source confidence, expiration, and confidence decay.
- Inspect evidence-backed relationships between indicators, malware, tools, campaigns, reports, and related objects.
- Record internal sightings and use prevalence to raise priority for local telemetry matches.
- Build read-only retro-hunt queries across DNS, proxy, endpoint, and SIEM data sources.
- Create detection intents from high-confidence intel with citations back to imported objects.

## Source Registration

Create a source before import:

```http
POST /threat-intel/sources
```

Required fields:

- `name`: readable source name.
- `type`: `stix-file`, `taxii`, `misp`, `internal`, or `manual`.
- `trustScore`: decimal confidence multiplier from `0` to `1`.
- `owner`: team or person accountable for feed quality.
- `updateCadence`: expected refresh frequency.
- `retentionDays`: expiration window for confidence and lifecycle decisions.

Use lower trust scores for community or unverified sources. Treat high confidence as triage priority, not automatic enforcement.

## Feed Import

Import a file-backed STIX bundle:

```http
POST /threat-intel/feeds/import
```

Use `format: "stix"` with a `bundle` payload or `format: "misp"` with an `event` payload. The import normalizes objects, indicators, confidence, expiration, labels, and relationships. Imported records are persisted in local state and can optionally be linked to a case with `caseId`.

## Graph Review

Fetch a one-hop relationship graph:

```http
GET /threat-intel/graph/{objectId}
```

The graph response includes nodes, evidence-backed edges, source IDs, confidence, and citations. Use this view to explain why an indicator is related to another object before turning it into a hunt or detection.

## Internal Sightings

Existing sightings use:

```http
POST /threat-intel/sightings
```

Sightings increase local prevalence for the indicator and are reflected in later enrichment. This keeps priority grounded in internal telemetry instead of external reputation alone.

## Retro-Hunts

Plan read-only hunts:

```http
POST /threat-intel/retro-hunts
```

The API returns query drafts only. Operators should run them through approved SIEM or EDR workflows, preserve evidence references, and avoid enforcement until an analyst validates the result.

## Intel-To-Detection

Create a detection intent from imported intel:

```http
POST /threat-intel/detections/from-intel
```

The generated intent includes defensive behavior, data sources, severity, entities, and evidence references. Use the normal detection engineering workflow to generate rules, validate fixtures, simulate false positives, and track deployment.

## Quality Checks

- Every source must have an owner and trust score.
- Every imported indicator should include source ID, confidence, expiration, and labels when available.
- Relationships should include evidence text.
- Retro-hunts must be read-only and auditable.
- Detection intents must cite imported intel records.

## Safety Boundary

Threat intelligence features support defensive detection, triage, remediation, and reporting. Do not use this workflow for targeting third parties, operational abuse, evasion, malware changes, credential theft, or exploit guidance.
