import path from "node:path";
import { AuditEventService } from "../audit/audit-event-service";
import type { AuditEntry } from "../schemas/case.schema";
import { appendJsonLine, readJsonFile, writeJsonFile } from "../utils/files";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export class AuditService {
  private readonly auditEventService: AuditEventService;

  constructor(private readonly dataDir: string, auditEventService?: AuditEventService) {
    this.auditEventService = auditEventService ?? new AuditEventService(dataDir);
  }

  async record(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<AuditEntry> {
    const auditEvent = await this.auditEventService.record({
      caseId: entry.caseId,
      action: entry.action,
      result: entry.allowed === false ? "denied" : "allowed",
      summary: entry.summary,
      metadata: entry.metadata
    });
    const fullEntry: AuditEntry = {
      id: createId("audit"),
      timestamp: nowIso(),
      ...entry,
      metadata: {
        ...(entry.metadata ?? {}),
        auditEventId: auditEvent.id,
        auditHash: auditEvent.hash,
        auditSequence: auditEvent.sequence
      }
    };

    await appendJsonLine(path.join(this.dataDir, "audits", "audit.jsonl"), fullEntry);

    if (fullEntry.caseId) {
      const caseAuditPath = path.join(this.dataDir, "audits", `${fullEntry.caseId}.json`);
      const existing = await this.listForCase(fullEntry.caseId);
      await writeJsonFile(caseAuditPath, [...existing, fullEntry]);
    }

    return fullEntry;
  }

  async listForCase(caseId: string): Promise<AuditEntry[]> {
    const caseAuditPath = path.join(this.dataDir, "audits", `${caseId}.json`);
    try {
      return await readJsonFile<AuditEntry[]>(caseAuditPath);
    } catch {
      return [];
    }
  }
}
