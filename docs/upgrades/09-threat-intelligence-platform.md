# 09 - Threat Intelligence Platform

## Purpose

Move threat intelligence from local enrichment into a platform for indicator lifecycle, source confidence, sightings, relationships, retro-hunts, and intel-to-detection workflows.

## Current Gap

The MVP has local threat intel enrichment and sightings, but lacks STIX/TAXII, MISP, feed management, relationship graphs, confidence decay, and internal prevalence scoring.

## Target Operator Outcome

An analyst can ingest trusted intel, understand source confidence and expiration, correlate sightings against internal telemetry, generate defensive retro-hunts, and convert high-confidence intel into detections.

## Safety Boundary

- Threat intel should support defensive detection, triage, and remediation.
- Avoid operational guidance for abusing infrastructure, evading detection, or targeting third parties.
- Retro-hunts must be read-only and audited.

## Proposed Architecture

- Intel source registry stores trust, owner, feed type, update cadence, and retention policy.
- STIX parser normalizes indicators, malware, tools, campaigns, actors, reports, and relationships.
- Feed ingestion jobs pull TAXII, MISP, or file-based bundles.
- Confidence decay service adjusts priority over time and by source quality.
- Sighting correlation service checks internal telemetry and raises priority for local prevalence.
- Relationship graph service links indicators, actors, tools, malware, campaigns, and techniques.
- Intel-to-detection service creates detection intents from high-confidence intel.

## Expected File Changes

New files:

- `apps/api/src/threat-intel/stix-parser.ts`
- `apps/api/src/threat-intel/taxii-connector.ts`
- `apps/api/src/threat-intel/misp-connector.ts`
- `apps/api/src/threat-intel/intel-source-registry.ts`
- `apps/api/src/threat-intel/confidence-decay-service.ts`
- `apps/api/src/threat-intel/relationship-graph-service.ts`
- `apps/api/src/threat-intel/retro-hunt-builder.ts`
- `apps/api/src/threat-intel/intel-to-detection-service.ts`
- `apps/api/src/schemas/threat-intel-v2.schema.ts`
- `data/fixtures/threat-intel/stix-bundle.json`
- `data/fixtures/threat-intel/misp-event.json`
- `data/fixtures/threat-intel/internal-prevalence.json`
- `tests/unit/threat-intel-platform.test.ts`
- `tests/integration/threat-intel-platform-flow.test.ts`
- `docs/analyst-guide/threat-intelligence.md`

Existing files to modify:

- `apps/api/src/threat-intel/threat-intel-service.ts`: orchestrate v2 enrichment and graph.
- `apps/api/src/threat-intel/enrichment-registry.ts`: register feed and source adapters.
- `apps/api/src/threat-intel/lifecycle-service.ts`: add confidence decay and expiration.
- `apps/api/src/threat-intel/sighting-service.ts`: include prevalence and retro-hunt results.
- `apps/api/src/threat-intel/local-reputation.adapter.ts`: conform to source registry.
- `apps/api/src/routes/threat-intel.ts`: add source, feed, graph, and retro-hunt endpoints.
- `apps/api/src/detections/detection-intent-builder.ts`: accept intel-to-detection inputs.
- `apps/api/src/schemas/case.schema.ts`: store intel graph references and sightings.
- `docs/api/openapi.yaml`: document threat intel platform endpoints.

## Data Model Additions

- `IntelSource`: id, type, trust score, owner, update cadence, retention, enabled.
- `StixObjectRecord`: object id, type, content, source id, confidence, firstSeen, expiresAt.
- `IntelRelationship`: source object, target object, relationship type, evidence, confidence.
- `InternalSighting`: indicator id, source telemetry, count, lastSeen, case refs.
- `RetroHuntRequest`: indicator set, data sources, time range, status, results.

## API Changes

- `POST /threat-intel/sources`
- `POST /threat-intel/feeds/import`
- `GET /threat-intel/graph/:objectId`
- `POST /threat-intel/retro-hunts`
- `POST /threat-intel/detections/from-intel`

## UI Changes

- Intel source management page.
- Indicator lifecycle and confidence view.
- Relationship graph.
- Retro-hunt status and results.
- Intel-to-detection workflow entry point.

## Milestones

- [x] Add STIX object model and parser.
- [x] Add TAXII/MISP connector scaffolds.
- [x] Add source confidence and expiration policy.
- [x] Add relationship graph service.
- [x] Add internal sighting correlation.
- [x] Add retro-hunt request builder.
- [x] Add intel-to-detection workflow.

## Acceptance Criteria

- Indicators include source, confidence, and expiration.
- Internal sightings adjust priority.
- Relationships are evidence-backed.
- Retro-hunts are read-only and auditable.
- Intel can create detection intents with citations.

## Test Plan

- Unit tests for STIX parsing, confidence decay, relationship graph, and retro-hunt building.
- Integration tests for feed ingestion, sightings, graph retrieval, and detection handoff.
- Eval tests for intel summaries and safe defensive recommendations.

## Rollout Notes

Start with file-based STIX/MISP fixtures before live TAXII or MISP connectivity.
