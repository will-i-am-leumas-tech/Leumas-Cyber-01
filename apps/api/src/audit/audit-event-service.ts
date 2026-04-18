import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AuditEvent, AuditIntegrityRecord, AuditResult, GovernanceExportFilter, VersionRecord } from "../schemas/audit.schema";
import { auditEventSchema, governanceExportFilterSchema } from "../schemas/audit.schema";
import { appendJsonLine } from "../utils/files";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { auditGenesisHash, hashAuditEvent, verifyAuditChain } from "./integrity-service";
import { getVersionRecords } from "./version-registry";

export interface RecordAuditEventInput {
  caseId?: string;
  actor?: string;
  action: string;
  resource?: string;
  result: AuditResult;
  summary: string;
  metadata?: Record<string, unknown>;
  versions?: VersionRecord[];
}

function parseJsonLines(raw: string): unknown[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

export class AuditEventService {
  constructor(private readonly dataDir: string) {}

  private eventPath(): string {
    return path.join(this.dataDir, "audits", "audit-events.jsonl");
  }

  private integrityPath(): string {
    return path.join(this.dataDir, "audits", "audit-integrity.jsonl");
  }

  async listEvents(filters: GovernanceExportFilter = governanceExportFilterSchema.parse({})): Promise<AuditEvent[]> {
    if (!existsSync(this.eventPath())) {
      return [];
    }

    const parsedFilters = governanceExportFilterSchema.parse(filters);
    const rawEvents = parseJsonLines(await readFile(this.eventPath(), "utf8"));
    return rawEvents
      .map((event) => auditEventSchema.parse(event))
      .filter((event) => !parsedFilters.caseId || event.caseId === parsedFilters.caseId)
      .filter((event) => !parsedFilters.action || event.action === parsedFilters.action)
      .filter((event) => !parsedFilters.result || event.result === parsedFilters.result)
      .filter((event) => !parsedFilters.from || event.timestamp >= parsedFilters.from)
      .filter((event) => !parsedFilters.to || event.timestamp <= parsedFilters.to)
      .slice(-parsedFilters.limit);
  }

  async getEvent(eventId: string): Promise<AuditEvent | null> {
    const events = await this.listEvents({ limit: 1000 });
    return events.find((event) => event.id === eventId) ?? null;
  }

  async record(input: RecordAuditEventInput): Promise<AuditEvent> {
    const existing = await this.listEvents({ limit: 1000 });
    const previous = existing.at(-1);
    const eventWithoutHash: Omit<AuditEvent, "hash"> = {
      id: createId("audit_event"),
      caseId: input.caseId,
      actor: input.actor ?? "system",
      action: input.action,
      resource: input.resource ?? (input.caseId ? `case:${input.caseId}` : "system"),
      result: input.result,
      summary: input.summary,
      timestamp: nowIso(),
      metadata: input.metadata ?? {},
      versions: input.versions ?? getVersionRecords(String(input.metadata?.provider ?? "local-mock")),
      sequence: (previous?.sequence ?? 0) + 1,
      previousHash: previous?.hash ?? auditGenesisHash
    };
    const event: AuditEvent = {
      ...eventWithoutHash,
      hash: hashAuditEvent(eventWithoutHash)
    };
    const integrity: AuditIntegrityRecord = {
      id: createId("audit_integrity"),
      eventId: event.id,
      sequence: event.sequence,
      previousHash: event.previousHash,
      currentHash: event.hash,
      verifiedAt: nowIso()
    };

    await appendJsonLine(this.eventPath(), event);
    await appendJsonLine(this.integrityPath(), integrity);
    return event;
  }

  async verifyStoredChain(): Promise<ReturnType<typeof verifyAuditChain>> {
    const events = await this.listEvents({ limit: 1000 });
    return verifyAuditChain(events);
  }
}
