# 03 - Data Ingestion And Normalization

## Purpose

Support realistic security data by parsing, validating, normalizing, and preserving provenance for logs, alerts, cloud events, identity events, and case artifacts.

## Target Capability

- Accept large and multi-file uploads.
- Parse common security formats.
- Normalize records into an internal event schema.
- Track source references for every extracted observation.
- Deduplicate and correlate entities across files.

## Current State

- Uploads support one small `.log`, `.txt`, `.json`, or `.csv` file.
- Logs are parsed mostly with regex.
- No internal event schema exists.

## Scope

- Parser framework.
- Internal event schema.
- File metadata and hashing.
- Chunking for large files.
- Provenance tracking from input record to case finding.

## Non-Goals

- No execution of uploaded content.
- No malware detonation in this feature.
- No unsafe parsing of archives without size, type, and path controls.

## Proposed Architecture

- `UploadedArtifact`: file metadata, hash, size, MIME type, storage ref.
- `ParserAdapter`: canParse, parse, confidence, warnings.
- `NormalizedEvent`: timestamp, source, eventType, actor, asset, network, process, rawRef.
- `Entity`: host, user, IP, domain, process, file, cloud identity, container.
- `SourceRef`: artifact ID, line number, JSON pointer, byte range, parser ID.

Suggested modules:

- `apps/api/src/ingest/artifact-service.ts`
- `apps/api/src/ingest/parser-registry.ts`
- `apps/api/src/ingest/parsers/json-alert.parser.ts`
- `apps/api/src/ingest/parsers/syslog.parser.ts`
- `apps/api/src/ingest/event-normalizer.ts`

## Data Model

Add:

- `artifacts[]`: id, filename, hash, sizeBytes, mediaType, storageRef.
- `normalizedEvents[]`: id, timestamp, eventType, severity, entities, sourceRef.
- `entities[]`: id, type, value, normalized, aliases.
- `parserWarnings[]`: parserId, sourceRef, message, severity.

## API Changes

- Extend `/analyze` for multiple files.
- Add `POST /cases/:id/artifacts`.
- Add `GET /cases/:id/events`.
- Add `GET /cases/:id/entities`.

## UI Changes

- Upload queue with file status.
- Parser warnings panel.
- Normalized event table.
- Entity list with counts and source references.

## Scaffold Steps

1. Add artifact schema and storage service.
2. Add parser registry interface.
3. Implement JSON alert, line log, and CSV parser adapters.
4. Add normalized event schema.
5. Refactor timeline builder to consume normalized events.
6. Preserve raw source references in observations.

## Test Plan

- Unit: parser selection by file type and content.
- Unit: JSON pointer source refs for nested alert fields.
- Unit: line-number source refs for log files.
- Integration: multi-file upload creates artifacts and events.
- Safety: zip slip and oversized file protections when archives are later added.

## Fixtures

- Existing alert and log fixtures.
- `data/fixtures/ingest/mixed-case-bundle/`
- `data/fixtures/ingest/malformed-alert.json`

## Acceptance Criteria

- Every normalized event links to a source reference.
- Parser warnings do not block analysis unless input is unusable.
- Timeline can be built from normalized events.
- Duplicate entities are merged.
- Upload tests cover valid and malformed inputs.

