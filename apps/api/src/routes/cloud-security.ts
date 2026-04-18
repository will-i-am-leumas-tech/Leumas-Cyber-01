import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { CloudAccount, CloudEvent, IdentityPrincipal, PermissionRisk, PostureFinding } from "../schemas/cloud-security.schema";
import { cloudEventImportSchema, identityEventImportSchema } from "../schemas/cloud-security.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { CloudSecurityService } from "../cloud/cloud-security-service";
import { summarizeAuthAnomalies } from "../identity/auth-anomaly-service";
import { nowIso } from "../utils/time";

interface CloudSecurityRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
  cloudSecurityService: CloudSecurityService;
}

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

async function appendCloudContextToCase(
  deps: CloudSecurityRouteDeps,
  caseId: string | undefined,
  imported: {
    cloudAccounts?: CloudAccount[];
    identityPrincipals?: IdentityPrincipal[];
    cloudEvents: CloudEvent[];
    postureFindings: PostureFinding[];
    permissionRisks: PermissionRisk[];
  }
): Promise<void> {
  if (!caseId) {
    return;
  }

  const cyberCase = await deps.caseService.getCase(caseId);
  if (!cyberCase) {
    return;
  }

  cyberCase.cloudAccounts.push(...(imported.cloudAccounts ?? []));
  cyberCase.identityPrincipals.push(...(imported.identityPrincipals ?? []));
  cyberCase.cloudEvents.push(...imported.cloudEvents);
  cyberCase.postureFindings.push(...imported.postureFindings);
  cyberCase.permissionRisks.push(...imported.permissionRisks);
  if (cyberCase.result) {
    cyberCase.result.timeline.push(
      ...imported.cloudEvents.map((event) => ({
        timestamp: event.timestamp,
        label: `${event.provider} ${event.service} ${event.action} by ${event.actor}`,
        source: event.rawRef,
        raw: `${event.resource} ${event.result}`
      }))
    );
    cyberCase.result.timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  cyberCase.updatedAt = nowIso();

  const audit = await deps.auditService.record({
    caseId,
    action: "cloud_context.imported",
    summary: `Imported ${imported.cloudEvents.length} cloud or identity event${imported.cloudEvents.length === 1 ? "" : "s"} into case context.`,
    allowed: true,
    metadata: {
      eventIds: imported.cloudEvents.map((event) => event.id),
      postureFindingIds: imported.postureFindings.map((finding) => finding.id),
      permissionRiskIds: imported.permissionRisks.map((risk) => risk.id)
    }
  });
  cyberCase.auditEntries.push(audit);
  await deps.caseService.saveCase(cyberCase);
}

export function registerCloudSecurityRoutes(app: FastifyInstance, deps: CloudSecurityRouteDeps): void {
  app.post("/cloud/events/import", async (request, reply) => {
    const input = cloudEventImportSchema.parse(request.body);
    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (!cyberCase) {
        return reply.code(404).send({ error: "case_not_found" });
      }
    }

    const imported = await deps.cloudSecurityService.importCloudEvents(input);
    await appendCloudContextToCase(deps, input.caseId, imported);
    const audit = await deps.auditService.record({
      action: "cloud.events_imported",
      summary: `Imported ${imported.cloudEvents.length} cloud event${imported.cloudEvents.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        caseId: input.caseId,
        eventCount: imported.cloudEvents.length,
        findingCount: imported.postureFindings.length,
        permissionRiskCount: imported.permissionRisks.length
      }
    });

    return {
      ...imported,
      audit
    };
  });

  app.post("/identity/events/import", async (request, reply) => {
    const input = identityEventImportSchema.parse(request.body);
    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (!cyberCase) {
        return reply.code(404).send({ error: "case_not_found" });
      }
    }

    const imported = await deps.cloudSecurityService.importIdentityEvents(input);
    await appendCloudContextToCase(deps, input.caseId, imported);
    const audit = await deps.auditService.record({
      action: "identity.events_imported",
      summary: `Imported ${imported.cloudEvents.length} identity event${imported.cloudEvents.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        caseId: input.caseId,
        eventCount: imported.cloudEvents.length,
        principalCount: imported.identityPrincipals.length,
        findingCount: imported.postureFindings.length,
        permissionRiskCount: imported.permissionRisks.length
      }
    });

    return {
      ...imported,
      authAnomalies: summarizeAuthAnomalies(imported.cloudEvents),
      audit
    };
  });

  app.get("/cloud/posture", async () => deps.cloudSecurityService.posture());

  app.get("/identity/risks", async () => {
    const risks = await deps.cloudSecurityService.identityRisks();
    return {
      ...risks,
      authAnomalies: summarizeAuthAnomalies(risks.cloudEvents)
    };
  });

  app.get("/cases/:id/cloud-context", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      cloudAccounts: cyberCase.cloudAccounts,
      identityPrincipals: cyberCase.identityPrincipals,
      cloudEvents: cyberCase.cloudEvents,
      postureFindings: cyberCase.postureFindings,
      permissionRisks: cyberCase.permissionRisks,
      authAnomalies: summarizeAuthAnomalies(cyberCase.cloudEvents)
    };
  });
}
