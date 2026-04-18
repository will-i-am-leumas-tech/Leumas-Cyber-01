import type { AuditEvent } from "../../schemas/audit.schema";
import { AuditEventService } from "../../audit/audit-event-service";
import type { AuditRepository } from "../storage-adapter";

export class LocalJsonAuditRepository implements AuditRepository {
  private readonly auditEventService: AuditEventService;

  constructor(dataDir: string) {
    this.auditEventService = new AuditEventService(dataDir);
  }

  async append(event: AuditEvent): Promise<AuditEvent> {
    return this.auditEventService.record({
      caseId: event.caseId,
      actor: event.actor,
      action: event.action,
      resource: event.resource,
      result: event.result,
      summary: event.summary,
      metadata: event.metadata,
      versions: event.versions
    });
  }

  async list(filters: { caseId?: string; limit?: number } = {}): Promise<AuditEvent[]> {
    return this.auditEventService.listEvents({
      caseId: filters.caseId,
      limit: filters.limit ?? 250
    });
  }
}
