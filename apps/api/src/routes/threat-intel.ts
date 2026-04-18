import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createInternalSightingSchema,
  patchIndicatorLifecycleSchema,
  threatIntelEnrichSchema
} from "../schemas/threat-intel.schema";
import {
  createIntelSourceSchema,
  importIntelFeedSchema,
  intelDetectionInputSchema,
  retroHuntRequestInputSchema
} from "../schemas/threat-intel-v2.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { ThreatIntelService } from "../threat-intel/threat-intel-service";
import { nowIso } from "../utils/time";

interface ThreatIntelRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
  threatIntelService: ThreatIntelService;
}

const indicatorParamsSchema = z.object({
  id: z.string().min(1)
});

async function appendThreatIntelToCase(
  deps: ThreatIntelRouteDeps,
  caseId: string | undefined,
  result: Awaited<ReturnType<ThreatIntelService["enrichIndicators"]>>
): Promise<void> {
  if (!caseId) {
    return;
  }
  const cyberCase = await deps.caseService.getCase(caseId);
  if (!cyberCase) {
    return;
  }

  cyberCase.threatIntelSources = result.threatIntelSources;
  cyberCase.indicatorEnrichments.push(...result.indicatorEnrichments);
  cyberCase.threatContextSummaries.push(...result.threatContextSummaries);
  cyberCase.updatedAt = nowIso();
  const audit = await deps.auditService.record({
    caseId,
    action: "threat_intel.enriched",
    summary: `Added ${result.indicatorEnrichments.length} indicator enrichment result${result.indicatorEnrichments.length === 1 ? "" : "s"} to case.`,
    allowed: true,
    metadata: {
      enrichmentIds: result.indicatorEnrichments.map((enrichment) => enrichment.id),
      summaryIds: result.threatContextSummaries.map((summary) => summary.id)
    }
  });
  cyberCase.auditEntries.push(audit);
  await deps.caseService.saveCase(cyberCase);
}

export function registerThreatIntelRoutes(app: FastifyInstance, deps: ThreatIntelRouteDeps): void {
  app.post("/threat-intel/enrich", async (request, reply) => {
    const input = threatIntelEnrichSchema.parse(request.body);
    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (!cyberCase) {
        return reply.code(404).send({ error: "case_not_found" });
      }
    }

    const result = await deps.threatIntelService.enrichIndicators(input.indicators, input.caseId);
    await appendThreatIntelToCase(deps, input.caseId, result);
    const audit = await deps.auditService.record({
      action: "threat_intel.enrich_requested",
      summary: `Enriched ${input.indicators.length} indicator${input.indicators.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        caseId: input.caseId,
        enrichmentCount: result.indicatorEnrichments.length
      }
    });

    return {
      ...result,
      audit
    };
  });

  app.post("/threat-intel/sources", async (request) => {
    const input = createIntelSourceSchema.parse(request.body);
    const intelSource = await deps.threatIntelService.createSource(input);
    const audit = await deps.auditService.record({
      action: "threat_intel.source_created",
      summary: `Created threat intel source ${intelSource.name}.`,
      allowed: true,
      metadata: {
        sourceId: intelSource.id,
        type: intelSource.type,
        trustScore: intelSource.trustScore
      }
    });

    return {
      intelSource,
      audit
    };
  });

  app.post("/threat-intel/feeds/import", async (request, reply) => {
    const input = importIntelFeedSchema.parse(request.body);
    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (!cyberCase) {
        return reply.code(404).send({ error: "case_not_found" });
      }
    }

    const result = await deps.threatIntelService.importFeed(input);
    const audit = await deps.auditService.record({
      caseId: input.caseId,
      action: "threat_intel.feed_imported",
      summary: `Imported ${result.stixObjects.length} threat intel object${result.stixObjects.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        sourceId: result.intelSource.id,
        format: input.format,
        objectIds: result.stixObjects.map((object) => object.id),
        relationshipIds: result.intelRelationships.map((relationship) => relationship.id)
      }
    });

    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (cyberCase) {
        cyberCase.intelSourcesV2.push(result.intelSource);
        cyberCase.stixObjects.push(...result.stixObjects);
        cyberCase.intelRelationships.push(...result.intelRelationships);
        cyberCase.auditEntries.push(audit);
        cyberCase.updatedAt = nowIso();
        await deps.caseService.saveCase(cyberCase);
      }
    }

    return {
      ...result,
      audit
    };
  });

  app.get("/threat-intel/indicators/:id", async (request) => {
    const params = indicatorParamsSchema.parse(request.params);
    return deps.threatIntelService.getIndicator(params.id);
  });

  app.get("/threat-intel/graph/:id", async (request) => {
    const params = indicatorParamsSchema.parse(request.params);
    return deps.threatIntelService.getGraph(params.id);
  });

  app.post("/threat-intel/sightings", async (request, reply) => {
    const input = createInternalSightingSchema.parse(request.body);
    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (!cyberCase) {
        return reply.code(404).send({ error: "case_not_found" });
      }
    }

    const sighting = await deps.threatIntelService.addSighting(input);
    const audit = await deps.auditService.record({
      caseId: input.caseId,
      action: "threat_intel.sighting_recorded",
      summary: `Recorded internal sighting for ${input.indicatorId}.`,
      allowed: true,
      metadata: {
        sightingId: sighting.id,
        indicatorId: input.indicatorId
      }
    });
    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (cyberCase) {
        cyberCase.internalSightings.push(sighting);
        cyberCase.auditEntries.push(audit);
        cyberCase.updatedAt = nowIso();
        await deps.caseService.saveCase(cyberCase);
      }
    }

    return {
      internalSighting: sighting,
      audit
    };
  });

  app.patch("/threat-intel/indicators/:id/lifecycle", async (request) => {
    const params = indicatorParamsSchema.parse(request.params);
    const input = patchIndicatorLifecycleSchema.parse(request.body);
    const lifecycle = await deps.threatIntelService.updateLifecycle(params.id, input);
    const audit = await deps.auditService.record({
      action: "threat_intel.lifecycle_updated",
      summary: `Updated lifecycle for ${params.id} to ${lifecycle.status}.`,
      allowed: true,
      metadata: {
        indicatorId: params.id,
        lifecycleId: lifecycle.id,
        status: lifecycle.status,
        expiresAt: lifecycle.expiresAt
      }
    });

    return {
      indicatorLifecycle: lifecycle,
      audit
    };
  });

  app.post("/threat-intel/retro-hunts", async (request, reply) => {
    const input = retroHuntRequestInputSchema.parse(request.body);
    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (!cyberCase) {
        return reply.code(404).send({ error: "case_not_found" });
      }
    }

    const retroHunt = await deps.threatIntelService.createRetroHunt(input);
    const audit = await deps.auditService.record({
      caseId: input.caseId,
      action: "threat_intel.retro_hunt_planned",
      summary: `Planned ${retroHunt.results.length} read-only retro-hunt quer${retroHunt.results.length === 1 ? "y" : "ies"}.`,
      allowed: true,
      metadata: {
        retroHuntId: retroHunt.id,
        indicatorIds: retroHunt.indicatorIds,
        dataSources: retroHunt.dataSources,
        readOnly: true
      }
    });

    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (cyberCase) {
        cyberCase.retroHunts.push(retroHunt);
        cyberCase.auditEntries.push(audit);
        cyberCase.updatedAt = nowIso();
        await deps.caseService.saveCase(cyberCase);
      }
    }

    return {
      retroHunt,
      audit
    };
  });

  app.post("/threat-intel/detections/from-intel", async (request, reply) => {
    const input = intelDetectionInputSchema.parse(request.body);
    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (!cyberCase) {
        return reply.code(404).send({ error: "case_not_found" });
      }
    }

    const result = await deps.threatIntelService.buildDetectionFromIntel(input);
    if (result.citations.length === 0) {
      return reply.code(404).send({ error: "intel_indicator_not_found", warnings: result.warnings });
    }

    const audit = await deps.auditService.record({
      caseId: input.caseId,
      action: "threat_intel.detection_intent_created",
      summary: `Created intel-backed detection intent ${result.detectionIntent.id}.`,
      allowed: true,
      metadata: {
        detectionIntentId: result.detectionIntent.id,
        citations: result.citations,
        warnings: result.warnings
      }
    });

    if (input.caseId) {
      const cyberCase = await deps.caseService.getCase(input.caseId);
      if (cyberCase) {
        cyberCase.detectionIntents.push(result.detectionIntent);
        cyberCase.auditEntries.push(audit);
        cyberCase.updatedAt = nowIso();
        await deps.caseService.saveCase(cyberCase);
      }
    }

    return {
      ...result,
      audit
    };
  });
}
