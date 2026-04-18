import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { normalizeEndpointEvents, normalizeEndpointLogText } from "../endpoint/endpoint-event-normalizer";
import { buildProcessTree } from "../endpoint/process-tree-service";
import { buildArtifactChecklist, buildForensicArtifactsFromInput } from "../forensics/artifact-checklist-service";
import { buildForensicTimeline } from "../forensics/timeline-service";
import { endpointEventsImportSchema, forensicArtifactsBodySchema } from "../schemas/endpoint.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { nowIso } from "../utils/time";

interface EndpointRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

export function registerEndpointRoutes(app: FastifyInstance, deps: EndpointRouteDeps): void {
  app.post("/cases/:id/endpoint-events", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const body = endpointEventsImportSchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const events = [
      ...(body.text ? normalizeEndpointLogText(body.text, params.id) : []),
      ...(body.events ? normalizeEndpointEvents(body.events, params.id) : [])
    ];
    const processTrees = buildProcessTree(events, params.id);
    const forensicTimeline = buildForensicTimeline(events, params.id);
    const checklist = buildArtifactChecklist(params.id, events);

    cyberCase.endpointEvents.push(...events);
    cyberCase.processTrees.push(...processTrees);
    cyberCase.forensicTimeline.push(...forensicTimeline);
    cyberCase.forensicArtifacts.push(...checklist);
    if (cyberCase.result) {
      cyberCase.result.timeline.push(
        ...forensicTimeline.map((event) => ({
          timestamp: event.timestamp,
          label: `${event.eventType} ${event.summary}`,
          source: event.sourceRef,
          raw: event.processGuid
        }))
      );
      cyberCase.result.timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "endpoint.events_imported",
      summary: `Imported ${events.length} endpoint event${events.length === 1 ? "" : "s"} and built ${processTrees.length} process tree${processTrees.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        eventCount: events.length,
        processTreeIds: processTrees.map((tree) => tree.id),
        forensicTimelineCount: forensicTimeline.length,
        checklistCount: checklist.length
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      endpointEvents: events,
      processTrees,
      forensicTimeline,
      forensicArtifacts: checklist,
      case: cyberCase
    };
  });

  app.get("/cases/:id/process-tree", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      processTrees: cyberCase.processTrees
    };
  });

  app.get("/cases/:id/forensic-timeline", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      forensicTimeline: cyberCase.forensicTimeline
    };
  });

  app.post("/cases/:id/forensic-artifacts", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const body = forensicArtifactsBodySchema.parse(request.body ?? {});
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const artifacts =
      body.artifacts && body.artifacts.length > 0
        ? buildForensicArtifactsFromInput(params.id, body.artifacts)
        : buildArtifactChecklist(params.id, cyberCase.endpointEvents);
    cyberCase.forensicArtifacts.push(...artifacts);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "forensic.artifacts_recorded",
      summary: `Recorded ${artifacts.length} forensic artifact checklist item${artifacts.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        artifactIds: artifacts.map((artifact) => artifact.id)
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      forensicArtifacts: artifacts,
      case: cyberCase
    };
  });
}
