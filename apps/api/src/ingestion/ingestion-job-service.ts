import type { Entity, ParserWarning } from "../schemas/ingest.schema";
import {
  evidenceRecordSchema,
  ingestionJobRequestSchema,
  ingestionJobSchema,
  type ChainOfCustodyEntry,
  type DeduplicationRecord,
  type EvidenceRecord,
  type EvidenceSource,
  type IngestionJob,
  type IngestionJobRequest
} from "../schemas/ingestion.schema";
import type { DataClass, SensitiveFinding } from "../schemas/privacy.schema";
import { classifySensitiveData, detectSensitiveData } from "../privacy/sensitive-data-detector";
import { sha256Text } from "../reasoning/hash";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { buildCustodyEntry } from "./chain-of-custody-service";
import { DeduplicationService, fingerprintEvent } from "./deduplication-service";
import type { EvidenceSourceRegistry } from "./evidence-source-registry";
import { parseEvidencePayload } from "./ingestion-worker";

export interface IngestionJobResult {
  job: IngestionJob;
  source: EvidenceSource;
  evidenceRecords: EvidenceRecord[];
  custodyEntries: ChainOfCustodyEntry[];
  deduplicationRecords: DeduplicationRecord[];
  parserWarnings: ParserWarning[];
  entities: Entity[];
  sensitiveFindings: SensitiveFinding[];
}

const dataClassRank: Record<DataClass, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3
};

function maxDataClass(left: DataClass, right: DataClass): DataClass {
  return dataClassRank[left] >= dataClassRank[right] ? left : right;
}

function payloadText(input: IngestionJobRequest): string {
  if (input.text !== undefined) {
    return input.text;
  }
  if (input.json !== undefined) {
    return JSON.stringify(input.json, null, 2);
  }
  return "";
}

export class IngestionJobService {
  private readonly jobs = new Map<string, IngestionJobResult>();
  private readonly evidence = new Map<string, EvidenceRecord>();
  private readonly deduplicationService = new DeduplicationService();

  constructor(private readonly sourceRegistry: EvidenceSourceRegistry) {}

  startJob(input: IngestionJobRequest): IngestionJobResult | null {
    const request = ingestionJobRequestSchema.parse(input);
    const source = this.sourceRegistry.get(request.sourceId);
    if (!source) {
      return null;
    }

    const rawText = payloadText(request);
    const rawHash = sha256Text(rawText);
    const jobId = createId("ingestion_job");
    const requestedAt = nowIso();
    let job = ingestionJobSchema.parse({
      id: jobId,
      sourceId: source.id,
      status: "running",
      actor: request.actor,
      requestedAt,
      startedAt: requestedAt,
      counters: {
        recordsSeen: 0,
        recordsParsed: 0,
        recordsDeduplicated: 0,
        parserWarnings: 0
      },
      errors: []
    });

    try {
      const artifactId = `ingestion_artifact_${rawHash.slice(0, 16)}`;
      const parsed = parseEvidencePayload({
        source,
        artifactId,
        text: request.text,
        json: request.json
      });
      const sensitiveFindings = detectSensitiveData(rawText, `ingestion:${source.id}`);
      const dataClass = maxDataClass(source.dataClass, classifySensitiveData(sensitiveFindings));
      const custodyEntries: ChainOfCustodyEntry[] = [];
      const evidenceRecords: EvidenceRecord[] = [];
      const dedupeRecordsByFingerprint = new Map<string, DeduplicationRecord>();

      for (const event of parsed.events) {
        const eventHash = sha256Text(JSON.stringify(event));
        const fingerprint = fingerprintEvent(event);
        const recordId = createId("evidence");
        let record = evidenceRecordSchema.parse({
          id: recordId,
          sourceId: source.id,
          sourceType: source.type,
          sourceName: source.name,
          jobId,
          eventId: event.id,
          eventType: event.eventType,
          timestamp: event.timestamp,
          severity: event.severity,
          normalizedEvent: event,
          hash: eventHash,
          fingerprint,
          duplicate: false,
          dataClass,
          reliabilityScore: source.reliabilityScore,
          sensitiveFindingIds: sensitiveFindings.map((finding) => finding.id),
          createdAt: nowIso()
        });
        const dedupeResult = this.deduplicationService.record(record);
        record = evidenceRecordSchema.parse({
          ...record,
          duplicate: dedupeResult.duplicate,
          duplicateOf: dedupeResult.duplicateOf
        });
        dedupeRecordsByFingerprint.set(dedupeResult.record.fingerprint, dedupeResult.record);
        this.evidence.set(record.id, record);
        evidenceRecords.push(record);
        custodyEntries.push(
          buildCustodyEntry({
            evidenceId: record.id,
            sourceId: source.id,
            actor: request.actor,
            operation: "retrieved",
            outputHash: rawHash,
            details: {
              sourceName: source.name,
              sourceType: source.type
            }
          }),
          buildCustodyEntry({
            evidenceId: record.id,
            sourceId: source.id,
            actor: request.actor,
            operation: "parsed",
            inputHash: rawHash,
            outputHash: eventHash,
            details: {
              parserId: source.parserId,
              eventType: event.eventType
            }
          }),
          buildCustodyEntry({
            evidenceId: record.id,
            sourceId: source.id,
            actor: request.actor,
            operation: "deduplicated",
            inputHash: eventHash,
            outputHash: fingerprint,
            details: {
              duplicate: record.duplicate,
              duplicateOf: record.duplicateOf
            }
          }),
          buildCustodyEntry({
            evidenceId: record.id,
            sourceId: source.id,
            actor: request.actor,
            operation: "classified",
            inputHash: eventHash,
            details: {
              dataClass,
              sensitiveFindingCount: sensitiveFindings.length
            }
          })
        );
      }

      job = ingestionJobSchema.parse({
        ...job,
        status: "completed",
        completedAt: nowIso(),
        counters: {
          recordsSeen: parsed.recordsSeen,
          recordsParsed: evidenceRecords.length,
          recordsDeduplicated: evidenceRecords.filter((record) => record.duplicate).length,
          parserWarnings: parsed.warnings.length
        }
      });

      const result: IngestionJobResult = {
        job,
        source,
        evidenceRecords,
        custodyEntries,
        deduplicationRecords: [...dedupeRecordsByFingerprint.values()],
        parserWarnings: parsed.warnings,
        entities: parsed.entities,
        sensitiveFindings
      };
      this.jobs.set(job.id, result);
      return result;
    } catch (error) {
      const failedJob = ingestionJobSchema.parse({
        ...job,
        status: "failed",
        completedAt: nowIso(),
        errors: [error instanceof Error ? error.message : "Unexpected ingestion failure."]
      });
      const result: IngestionJobResult = {
        job: failedJob,
        source,
        evidenceRecords: [],
        custodyEntries: [],
        deduplicationRecords: [],
        parserWarnings: [],
        entities: [],
        sensitiveFindings: []
      };
      this.jobs.set(failedJob.id, result);
      return result;
    }
  }

  getJob(jobId: string): IngestionJobResult | null {
    return this.jobs.get(jobId) ?? null;
  }

  getEvidence(evidenceIds: string[]): EvidenceRecord[] {
    return evidenceIds.map((id) => this.evidence.get(id)).filter((record): record is EvidenceRecord => Boolean(record));
  }

  buildCaseLinkCustody(input: { evidence: EvidenceRecord[]; actor: string; caseId: string; note?: string }): ChainOfCustodyEntry[] {
    return input.evidence.map((record) =>
      buildCustodyEntry({
        evidenceId: record.id,
        sourceId: record.sourceId,
        actor: input.actor,
        operation: "case_linked",
        inputHash: record.hash,
        details: {
          caseId: input.caseId,
          note: input.note
        }
      })
    );
  }

  listDeduplicationRecords(): DeduplicationRecord[] {
    return this.deduplicationService.list();
  }
}
