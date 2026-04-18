# 13 - Endpoint And Forensics

## Purpose

Improve endpoint investigation by reconstructing process trees, correlating file, registry, network, and user-session activity, and producing forensic timelines.

## Target Capability

- Build process trees from endpoint logs.
- Correlate endpoint artifacts by host, user, process, and time.
- Create forensic timelines.
- Track collection status for triage artifacts.
- Summarize sandbox or static-analysis reports defensively.

## Current State

- The MVP detects some suspicious process patterns with regex.
- No process tree, artifact collection, or forensic model exists.

## Scope

- Endpoint event schema.
- Process tree builder.
- Forensic timeline builder.
- Artifact collection checklist.
- Defensive sample-analysis report ingestion.

## Non-Goals

- No malware execution.
- No instructions to improve malware, evade detection, persist, or steal data.
- No direct endpoint containment without safe action approvals.

## Proposed Architecture

- `EndpointEvent`: host, user, process, parentProcess, commandLine, file, registry, network, timestamp.
- `ProcessNode`: processGuid, image, commandLine, parentGuid, children, riskSignals.
- `ForensicArtifact`: type, source, collected, hash, storageRef, chainOfCustody.
- `ForensicTimelineEvent`: timestamp, host, actor, eventType, sourceRef.
- `SampleAnalysisSummary`: hashes, observed behavior, detections, safe remediation guidance.

Suggested modules:

- `apps/api/src/endpoint/endpoint-event-normalizer.ts`
- `apps/api/src/endpoint/process-tree-service.ts`
- `apps/api/src/forensics/timeline-service.ts`
- `apps/api/src/forensics/artifact-checklist-service.ts`
- `apps/api/src/routes/endpoint.ts`

## Data Model

Add:

- `endpointEvents[]`
- `processTrees[]`
- `forensicArtifacts[]`
- `forensicTimeline[]`
- `sampleAnalysisSummaries[]`

## API Changes

- `POST /cases/:id/endpoint-events`
- `GET /cases/:id/process-tree`
- `GET /cases/:id/forensic-timeline`
- `POST /cases/:id/forensic-artifacts`

## UI Changes

- Process tree view.
- Host timeline filters.
- Artifact checklist.
- Endpoint findings panel.

## Scaffold Steps

1. Add endpoint event schema.
2. Normalize Windows process fixture into endpoint events.
3. Build process tree from parent-child relationships.
4. Add risk signals for suspicious parent-child patterns.
5. Add forensic artifact checklist generation.
6. Render process tree in UI.

## Test Plan

- Unit: process tree builder handles out-of-order events.
- Unit: orphan processes are retained with warnings.
- Unit: suspicious process chain risk signal is added.
- Integration: analyze Windows process fixture and return process tree.
- Safety: sample analysis summaries avoid improvement or evasion guidance.

## Fixtures

- Existing `data/fixtures/logs/windows-process.log`
- `data/fixtures/endpoint/process-tree.json`
- `data/fixtures/endpoint/orphan-process-events.json`

## Acceptance Criteria

- Process trees are built from fixture logs.
- Timeline links to process nodes and source refs.
- Artifact checklist is generated for high-risk endpoint cases.
- UI can show parent-child process relationships.
- Unsafe malware-assistance content remains blocked.

