import type { AuditEventService } from "./audit-event-service";
import type { GovernanceExport, GovernanceExportFilter } from "../schemas/audit.schema";
import { governanceExportFilterSchema } from "../schemas/audit.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export class GovernanceExportService {
  constructor(private readonly auditEventService: AuditEventService) {}

  async createExport(input: { actor?: string; filters?: GovernanceExportFilter }): Promise<GovernanceExport> {
    const filters = governanceExportFilterSchema.parse(input.filters ?? {});
    const events = await this.auditEventService.listEvents(filters);
    const integritySummary = await this.auditEventService.verifyStoredChain();

    return {
      id: createId("governance_export"),
      createdAt: nowIso(),
      actor: input.actor ?? "system",
      filters,
      includedEventIds: events.map((event) => event.id),
      integritySummary,
      events
    };
  }
}
