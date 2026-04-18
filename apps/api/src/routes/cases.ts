import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildIngestionBundle } from "../ingest/event-normalizer";
import { mergeEntities } from "../ingest/entity-utils";
import { buildCaseQueueItem } from "../collaboration/case-queue-service";
import { reasoningReviewSchema } from "../schemas/reasoning-v2.schema";
import { uploadedInputFileSchema } from "../schemas/ingest.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

interface CaseRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

const appendArtifactSchema = z.object({
  filename: z.string().min(1),
  mediaType: z.string().optional(),
  text: z.string().min(1)
});

const reasoningReviewBodySchema = z.object({
  targetType: z.enum(["hypothesis", "finding", "contradiction", "unknown", "technique"]),
  targetId: z.string().min(1),
  status: z.enum(["approved", "needs_more_evidence", "rejected"]),
  reviewer: z.string().min(1).default("analyst"),
  notes: z.string().optional()
});

const caseQueueQuerySchema = z.object({
  state: z
    .enum(["new", "triaging", "investigating", "contained", "remediating", "monitoring", "closed"])
    .optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional()
});

export function registerCaseRoutes(app: FastifyInstance, deps: CaseRouteDeps): void {
  app.get("/cases", async () => ({
    cases: await deps.caseService.listCases()
  }));

  app.get("/cases/queue", async (request) => {
    const query = caseQueueQuerySchema.parse(request.query);
    const search = query.search?.trim().toLowerCase();
    const cases = (await deps.caseService.listFullCases()).filter((cyberCase) => {
      if (query.state && cyberCase.state !== query.state) {
        return false;
      }
      if (query.severity && cyberCase.severity !== query.severity) {
        return false;
      }
      if (query.assignedTo && cyberCase.assignedTo !== query.assignedTo) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [cyberCase.id, cyberCase.title, cyberCase.summary, cyberCase.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });

    return {
      cases: cases.map((cyberCase) => buildCaseQueueItem(cyberCase))
    };
  });

  app.get("/cases/:id", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return cyberCase;
  });

  app.get("/cases/:id/reasoning", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    if (!cyberCase.result?.reasoning) {
      return reply.code(404).send({ error: "reasoning_not_found" });
    }

    return cyberCase.result.reasoning;
  });

  app.get("/cases/:id/reasoning/v2", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      hypothesisNodes: cyberCase.reasoningHypothesisNodes,
      contradictions: cyberCase.reasoningContradictions,
      unknownRecords: cyberCase.reasoningUnknownRecords,
      techniqueMappings: cyberCase.techniqueMappings,
      reviews: cyberCase.reasoningReviews,
      groundingFindings: cyberCase.groundingFindings
    };
  });

  app.post("/cases/:id/reasoning/review", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const body = reasoningReviewBodySchema.parse(request.body);
    const review = reasoningReviewSchema.parse({
      id: createId("reasoning_review"),
      targetType: body.targetType,
      targetId: body.targetId,
      status: body.status,
      reviewer: body.reviewer,
      notes: body.notes,
      timestamp: nowIso()
    });

    cyberCase.reasoningReviews.push(review);
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "reasoning.reviewed",
      summary: `Reviewed ${body.targetType} ${body.targetId} as ${body.status}.`,
      allowed: true,
      metadata: {
        reviewId: review.id,
        targetType: body.targetType,
        targetId: body.targetId,
        status: body.status,
        reviewer: body.reviewer
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      review,
      reviews: cyberCase.reasoningReviews
    };
  });

  app.get("/cases/:id/events", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      events: cyberCase.result?.ingestion?.normalizedEvents ?? []
    };
  });

  app.get("/cases/:id/entities", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      entities: cyberCase.result?.ingestion?.entities ?? []
    };
  });

  app.post("/cases/:id/artifacts", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const artifactInput = appendArtifactSchema.parse(request.body);
    const file = uploadedInputFileSchema.parse(artifactInput);
    const ingestion = buildIngestionBundle({
      mode: cyberCase.mode,
      files: [file],
      redactionMode: "redact"
    });
    const current = cyberCase.result?.ingestion;
    const mergedIngestion = current
      ? {
          artifacts: [...current.artifacts, ...ingestion.artifacts],
          normalizedEvents: [...current.normalizedEvents, ...ingestion.normalizedEvents],
          entities: mergeEntities([...current.entities, ...ingestion.entities]),
          parserWarnings: [...current.parserWarnings, ...ingestion.parserWarnings]
        }
      : ingestion;

    if (cyberCase.result) {
      cyberCase.result.ingestion = mergedIngestion;
      cyberCase.normalizedArtifacts = mergedIngestion.entities;
    }

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "ingest.artifact_added",
      summary: `Added artifact ${artifactInput.filename} and normalized ${ingestion.normalizedEvents.length} event${ingestion.normalizedEvents.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        filename: artifactInput.filename,
        eventCount: ingestion.normalizedEvents.length,
        entityCount: ingestion.entities.length
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      artifact: ingestion.artifacts[0],
      ingestion: mergedIngestion
    };
  });

  app.post("/cases/:id/save", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const existing = await deps.caseService.getCase(params.id);
    if (!existing) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "case.saved",
      summary: "Case save requested through API.",
      allowed: true
    });

    const updated = await deps.caseService.appendAudit(params.id, audit);
    return {
      saved: true,
      case: updated
    };
  });
}
