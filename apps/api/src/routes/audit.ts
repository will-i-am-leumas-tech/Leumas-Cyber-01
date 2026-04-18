import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AuditEventService } from "../audit/audit-event-service";
import type { GovernanceExportService } from "../audit/governance-export-service";
import { getVersionRecords } from "../audit/version-registry";
import { governanceExportFilterSchema } from "../schemas/audit.schema";
import type { AuditService } from "../services/audit-service";

interface AuditRouteDeps {
  auditService: AuditService;
  auditEventService: AuditEventService;
  governanceExportService: GovernanceExportService;
}

const eventParamsSchema = z.object({
  id: z.string().min(1)
});

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

const auditQuerySchema = governanceExportFilterSchema.partial().extend({
  limit: z.coerce.number().int().positive().max(1000).optional()
});

const exportBodySchema = z
  .object({
    actor: z.string().min(1).default("auditor"),
    filters: governanceExportFilterSchema.partial().optional()
  })
  .default({});

export function registerAuditRoutes(app: FastifyInstance, deps: AuditRouteDeps): void {
  app.get("/audit/events", async (request) => {
    const query = auditQuerySchema.parse(request.query);
    const filters = governanceExportFilterSchema.parse(query);
    const events = await deps.auditEventService.listEvents(filters);
    const integrity = await deps.auditEventService.verifyStoredChain();
    return {
      events,
      integrity
    };
  });

  app.get("/audit/events/:id", async (request, reply) => {
    const params = eventParamsSchema.parse(request.params);
    const event = await deps.auditEventService.getEvent(params.id);
    if (!event) {
      return reply.code(404).send({ error: "audit_event_not_found" });
    }
    return event;
  });

  app.post("/audit/exports", async (request) => {
    const body = exportBodySchema.parse(request.body ?? {});
    return deps.governanceExportService.createExport({
      actor: body.actor,
      filters: governanceExportFilterSchema.parse(body.filters ?? {})
    });
  });

  app.get("/cases/:id/audit", async (request) => {
    const params = caseParamsSchema.parse(request.params);
    const filters = governanceExportFilterSchema.parse({ caseId: params.id, limit: 1000 });
    return {
      entries: await deps.auditService.listForCase(params.id),
      events: await deps.auditEventService.listEvents(filters),
      integrity: await deps.auditEventService.verifyStoredChain()
    };
  });

  app.get("/system/versions", async () => ({
    versions: getVersionRecords()
  }));
}
