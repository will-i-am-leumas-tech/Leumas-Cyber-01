import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  caseEvidenceImportRequestSchema,
  evidenceSourceRegistrationSchema,
  ingestionJobRequestSchema
} from "../schemas/ingestion.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import type { EvidenceSourceRegistry } from "../ingestion/evidence-source-registry";
import type { IngestionJobService } from "../ingestion/ingestion-job-service";
import { nowIso } from "../utils/time";

interface IngestionRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
  sourceRegistry: EvidenceSourceRegistry;
  ingestionJobService: IngestionJobService;
}

const jobParamsSchema = z.object({
  id: z.string().min(1)
});

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

function requirePayload(input: { text?: string; json?: unknown }): void {
  if (input.text === undefined && input.json === undefined) {
    throw Object.assign(new Error("Ingestion jobs require text or json evidence payload."), { statusCode: 400 });
  }
}

export function registerIngestionRoutes(app: FastifyInstance, deps: IngestionRouteDeps): void {
  app.post("/ingestion/sources", async (request) => {
    const input = evidenceSourceRegistrationSchema.parse(request.body);
    const source = deps.sourceRegistry.register(input);
    await deps.auditService.record({
      action: "ingestion.source_registered",
      summary: `Registered evidence source ${source.name}.`,
      allowed: true,
      metadata: {
        sourceId: source.id,
        type: source.type,
        parserId: source.parserId,
        owner: source.owner,
        retentionClass: source.retentionClass,
        dataClass: source.dataClass
      }
    });

    return {
      source
    };
  });

  app.get("/ingestion/sources", async () => ({
    sources: deps.sourceRegistry.list()
  }));

  app.post("/ingestion/jobs", async (request, reply) => {
    const input = ingestionJobRequestSchema.parse(request.body);
    requirePayload(input);
    const result = deps.ingestionJobService.startJob(input);
    if (!result) {
      return reply.code(404).send({ error: "evidence_source_not_found" });
    }

    await deps.auditService.record({
      action: result.job.status === "completed" ? "ingestion.job_completed" : "ingestion.job_failed",
      summary:
        result.job.status === "completed"
          ? `Ingested ${result.evidenceRecords.length} evidence record${result.evidenceRecords.length === 1 ? "" : "s"} from ${result.source.name}.`
          : `Ingestion job failed for ${result.source.name}.`,
      allowed: result.job.status === "completed",
      metadata: {
        jobId: result.job.id,
        sourceId: result.source.id,
        counters: result.job.counters,
        errors: result.job.errors
      }
    });

    return {
      ...result,
      deduplicationIndex: deps.ingestionJobService.listDeduplicationRecords()
    };
  });

  app.get("/ingestion/jobs/:id", async (request, reply) => {
    const params = jobParamsSchema.parse(request.params);
    const result = deps.ingestionJobService.getJob(params.id);
    if (!result) {
      return reply.code(404).send({ error: "ingestion_job_not_found" });
    }

    return {
      ...result,
      deduplicationIndex: deps.ingestionJobService.listDeduplicationRecords()
    };
  });

  app.post("/cases/:id/evidence/import", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const input = caseEvidenceImportRequestSchema.parse(request.body);
    const evidence = deps.ingestionJobService.getEvidence(input.evidenceIds);
    if (evidence.length !== input.evidenceIds.length) {
      return reply.code(404).send({
        error: "evidence_not_found",
        foundEvidenceIds: evidence.map((record) => record.id)
      });
    }

    const linkCustody = deps.ingestionJobService.buildCaseLinkCustody({
      evidence,
      actor: input.actor,
      caseId: params.id,
      note: input.note
    });

    const existingEvidenceIds = new Set(cyberCase.evidenceRecords.map((record) => record.id));
    const newEvidence = evidence.filter((record) => !existingEvidenceIds.has(record.id));
    cyberCase.evidenceRecords.push(...newEvidence);
    cyberCase.chainOfCustodyEntries.push(...linkCustody);
    cyberCase.deduplicationRecords = deps.ingestionJobService.listDeduplicationRecords();

    if (cyberCase.result?.ingestion) {
      cyberCase.result.ingestion.normalizedEvents.push(...newEvidence.map((record) => record.normalizedEvent));
    }

    cyberCase.updatedAt = nowIso();
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "ingestion.evidence_linked",
      summary: `Linked ${newEvidence.length} ingested evidence record${newEvidence.length === 1 ? "" : "s"} to case.`,
      allowed: true,
      metadata: {
        evidenceIds: newEvidence.map((record) => record.id),
        actor: input.actor,
        note: input.note
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      evidenceRecords: newEvidence,
      chainOfCustodyEntries: linkCustody,
      case: cyberCase
    };
  });
}
