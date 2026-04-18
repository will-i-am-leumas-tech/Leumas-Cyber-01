# 14 - Threat Intelligence

## Purpose

Enrich indicators and findings with trusted threat intelligence, internal sightings, confidence, and lifecycle metadata.

## Target Capability

- Enrich IOCs through local and external adapters.
- Track source reliability and confidence.
- Correlate indicators with internal sightings.
- Manage expiration, revocation, and false positives.
- Summarize threat context defensively.

## Current State

- IOC normalization is local only.
- No enrichment, reputation, source reliability, or indicator lifecycle exists.

## Scope

- Threat intel source model.
- Enrichment adapter interface.
- Indicator lifecycle records.
- Internal sighting correlation.
- Confidence and reliability scoring.

## Non-Goals

- No actor-attribution certainty without evidence.
- No operational offensive guidance.
- No automatic blocking without approval and expiry.

## Proposed Architecture

- `ThreatIntelSource`: name, type, trustTier, reliability, terms, enabled.
- `IndicatorEnrichment`: indicatorId, sourceId, verdict, confidence, tags, firstSeen, lastSeen.
- `InternalSighting`: indicatorId, source, asset, timestamp, eventRef.
- `IndicatorLifecycle`: status, expiresAt, falsePositiveReason, owner.
- `ThreatContextSummary`: defensive summary, related behaviors, recommended handling.

Suggested modules:

- `apps/api/src/threat-intel/enrichment-registry.ts`
- `apps/api/src/threat-intel/local-reputation.adapter.ts`
- `apps/api/src/threat-intel/sighting-service.ts`
- `apps/api/src/threat-intel/lifecycle-service.ts`
- `apps/api/src/routes/threat-intel.ts`

## Data Model

Add:

- `threatIntelSources[]`
- `indicatorEnrichments[]`
- `internalSightings[]`
- `indicatorLifecycle[]`
- `threatContextSummaries[]`

## API Changes

- `POST /threat-intel/enrich`
- `GET /threat-intel/indicators/:id`
- `POST /threat-intel/sightings`
- `PATCH /threat-intel/indicators/:id/lifecycle`

## UI Changes

- IOC enrichment table.
- Source reliability badges.
- Internal sightings timeline.
- Expiration and false-positive controls.

## Scaffold Steps

1. Add enrichment schemas.
2. Add local reputation fixture adapter.
3. Enrich normalized IOCs after `/analyze`.
4. Add internal sighting correlation from case events.
5. Add lifecycle state and expiration.
6. Render enrichment in result tabs.

## Test Plan

- Unit: enrichment merges multiple source results.
- Unit: lower reliability reduces confidence.
- Unit: expired indicators are flagged.
- Integration: IOC analysis returns enrichment results.
- Safety: threat context summaries remain defensive and non-procedural.

## Fixtures

- `data/fixtures/threat-intel/local-reputation.json`
- `data/fixtures/threat-intel/internal-sightings.json`
- `data/fixtures/threat-intel/expired-indicator.json`

## Acceptance Criteria

- IOC review includes enrichment and source metadata.
- Internal sightings are linked to cases.
- Indicator status and expiry are visible.
- False positives can be recorded.
- Enrichment results are auditable.

