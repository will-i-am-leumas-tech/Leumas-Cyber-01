import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createRiskExceptionSchema,
  createVulnerabilityRemediationTaskSchema,
  vulnerabilityImportSchema
} from "../schemas/vulnerabilities.schema";
import {
  createRemediationValidationSchema,
  scannerDeltaImportSchema,
  updateVulnerabilitySlaSchema
} from "../schemas/vulnerabilities-v2.schema";
import type { AuditService } from "../services/audit-service";
import { VulnerabilityService } from "../vulns/vulnerability-ingest-service";

interface VulnerabilityRouteDeps {
  auditService: AuditService;
  vulnerabilityService: VulnerabilityService;
}

const vulnerabilityParamsSchema = z.object({
  id: z.string().min(1)
});

export function registerVulnerabilityRoutes(app: FastifyInstance, deps: VulnerabilityRouteDeps): void {
  app.post("/vulnerabilities/import", async (request) => {
    const input = vulnerabilityImportSchema.parse(request.body);
    const imported = await deps.vulnerabilityService.importFindings(input);
    const audit = await deps.auditService.record({
      action: "vulnerability.imported",
      summary: `Imported ${imported.findings.length} vulnerability finding${imported.findings.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        findingIds: imported.findings.map((finding) => finding.id),
        assetCount: imported.assetProfiles.length
      }
    });

    return {
      vulnerabilityFindings: imported.findings,
      vulnerabilityContexts: imported.contexts,
      assetRiskProfiles: imported.assetProfiles,
      audit
    };
  });

  app.get("/vulnerabilities", async () => ({
    vulnerabilityFindings: await deps.vulnerabilityService.listFindings()
  }));

  app.get("/vulnerabilities/dashboard", async () => ({
    dashboard: await deps.vulnerabilityService.getDashboard()
  }));

  app.post("/vulnerabilities/import-delta", async (request) => {
    const input = scannerDeltaImportSchema.parse(request.body);
    const imported = await deps.vulnerabilityService.importDelta(input);
    const deltaSummary = [
      `${imported.delta.createdFindingIds.length} created`,
      `${imported.delta.updatedFindingIds.length} updated`,
      `${imported.delta.resolvedFindingIds.length} resolved`
    ].join(", ");
    const audit = await deps.auditService.record({
      action: "vulnerability.delta_imported",
      summary: `Imported scanner delta with ${deltaSummary} finding records.`,
      allowed: true,
      metadata: {
        createdFindingIds: imported.delta.createdFindingIds,
        updatedFindingIds: imported.delta.updatedFindingIds,
        resolvedFindingIds: imported.delta.resolvedFindingIds
      }
    });

    return {
      scannerDelta: imported.delta,
      vulnerabilityFindings: imported.findings,
      vulnerabilityEnrichments: imported.enrichments,
      assetExposures: imported.assetExposures,
      riskScores: imported.riskScores,
      vulnerabilitySlas: imported.slas,
      audit
    };
  });

  app.get("/vulnerabilities/:id", async (request, reply) => {
    const params = vulnerabilityParamsSchema.parse(request.params);
    const finding = await deps.vulnerabilityService.getFinding(params.id);
    if (!finding) {
      return reply.code(404).send({ error: "vulnerability_not_found" });
    }

    return finding;
  });

  app.post("/vulnerabilities/:id/remediation-tasks", async (request, reply) => {
    const params = vulnerabilityParamsSchema.parse(request.params);
    const input = createVulnerabilityRemediationTaskSchema.parse(request.body ?? {});
    const result = await deps.vulnerabilityService.createRemediationTask(params.id, input);
    if (!result) {
      return reply.code(404).send({ error: "vulnerability_not_found" });
    }

    const audit = await deps.auditService.record({
      action: "vulnerability.remediation_task_created",
      summary: `Created remediation task for vulnerability ${params.id}.`,
      allowed: true,
      metadata: {
        findingId: params.id,
        taskId: result.task.id,
        dueDate: result.task.dueDate
      }
    });

    return {
      remediationTask: result.task,
      audit
    };
  });

  app.post("/vulnerabilities/:id/enrich", async (request, reply) => {
    const params = vulnerabilityParamsSchema.parse(request.params);
    const result = await deps.vulnerabilityService.enrichFinding(params.id);
    if (!result) {
      return reply.code(404).send({ error: "vulnerability_not_found" });
    }

    const audit = await deps.auditService.record({
      action: "vulnerability.enriched",
      summary: `Enriched vulnerability ${params.id} with defensive advisory context.`,
      allowed: true,
      metadata: {
        findingId: params.id,
        cve: result.enrichment.cve,
        kev: result.enrichment.kev,
        epss: result.enrichment.epss,
        riskScore: result.riskScore.score
      }
    });

    return {
      vulnerabilityEnrichment: result.enrichment,
      riskScore: result.riskScore,
      audit
    };
  });

  app.patch("/vulnerabilities/:id/sla", async (request, reply) => {
    const params = vulnerabilityParamsSchema.parse(request.params);
    const input = updateVulnerabilitySlaSchema.parse(request.body ?? {});
    const result = await deps.vulnerabilityService.updateSla(params.id, input);
    if (!result) {
      return reply.code(404).send({ error: "vulnerability_not_found" });
    }

    const audit = await deps.auditService.record({
      action: "vulnerability.sla_updated",
      summary: `Updated SLA for vulnerability ${params.id}.`,
      allowed: true,
      metadata: {
        findingId: params.id,
        owner: result.sla.owner,
        dueDate: result.sla.dueDate,
        status: result.sla.status
      }
    });

    return {
      vulnerabilitySla: result.sla,
      audit
    };
  });

  app.post("/vulnerabilities/:id/validate-remediation", async (request, reply) => {
    const params = vulnerabilityParamsSchema.parse(request.params);
    const input = createRemediationValidationSchema.parse(request.body);
    const result = await deps.vulnerabilityService.validateRemediation(params.id, input);
    if (!result) {
      return reply.code(404).send({ error: "vulnerability_not_found" });
    }

    const audit = await deps.auditService.record({
      action: "vulnerability.remediation_validated",
      summary: `Recorded remediation validation ${result.validation.status} for vulnerability ${params.id}.`,
      allowed: result.validation.status === "validated" || result.validation.status === "accepted_risk",
      metadata: {
        findingId: params.id,
        validationId: result.validation.id,
        status: result.validation.status,
        residualRisk: result.validation.residualRisk
      }
    });

    return {
      remediationValidation: result.validation,
      audit
    };
  });

  app.post("/vulnerabilities/:id/exceptions", async (request, reply) => {
    const params = vulnerabilityParamsSchema.parse(request.params);
    const input = createRiskExceptionSchema.parse(request.body);
    const result = await deps.vulnerabilityService.createRiskException(params.id, input);
    if (!result) {
      return reply.code(404).send({ error: "vulnerability_not_found" });
    }
    if ("error" in result) {
      const audit = await deps.auditService.record({
        action: "vulnerability.exception_blocked",
        summary: "Risk exception was blocked because its expiry is not current.",
        allowed: false,
        metadata: {
          findingId: params.id,
          expiresAt: input.expiresAt
        }
      });
      return reply.code(400).send({
        error: result.error,
        audit
      });
    }

    const audit = await deps.auditService.record({
      action: "vulnerability.exception_created",
      summary: `Created risk exception for vulnerability ${params.id}.`,
      allowed: true,
      metadata: {
        findingId: params.id,
        exceptionId: result.exception.id,
        expiresAt: result.exception.expiresAt
      }
    });

    return {
      riskException: result.exception,
      audit
    };
  });
}
