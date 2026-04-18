import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createAuthorizationScopeSchema,
  createValidationCampaignSchema,
  createValidationResultSchema
} from "../schemas/validation.schema";
import { createAuthorizedScopeV2Schema, createValidationCampaignV2Schema } from "../schemas/validation-v2.schema";
import type { AuditService } from "../services/audit-service";
import { assertSafeValidationText, getValidationObjectiveTemplates } from "../validation/objective-library";
import { ValidationService } from "../validation/campaign-service";

interface ValidationRouteDeps {
  auditService: AuditService;
  validationService: ValidationService;
}

const campaignParamsSchema = z.object({
  id: z.string().min(1)
});

export function registerValidationRoutes(app: FastifyInstance, deps: ValidationRouteDeps): void {
  app.get("/validation/v2/templates", async () => ({
    templates: deps.validationService.listTemplatesV2()
  }));

  app.get("/validation/v2/scopes", async () => ({
    authorizationScopes: await deps.validationService.listScopesV2(),
    templates: deps.validationService.listTemplatesV2()
  }));

  app.post("/validation/v2/scopes", async (request) => {
    const input = createAuthorizedScopeV2Schema.parse(request.body);
    const scope = await deps.validationService.createScopeV2(input);
    const audit = await deps.auditService.record({
      action: "validation.v2_scope_created",
      summary: `Created signed validation scope ${scope.name}.`,
      allowed: true,
      metadata: {
        scopeId: scope.id,
        targetAllowlist: scope.targetAllowlist,
        targetDenylist: scope.targetDenylist,
        labMode: scope.labMode,
        approvedTemplateIds: scope.approvedTemplateIds
      }
    });

    return {
      authorizationScope: scope,
      audit
    };
  });

  app.post("/validation/v2/campaigns", async (request, reply) => {
    const input = createValidationCampaignV2Schema.parse(request.body);
    const unsafeMatches = assertSafeValidationText(input.requestedObjective);
    if (unsafeMatches.length > 0) {
      const audit = await deps.auditService.record({
        action: "validation.v2_campaign_blocked",
        summary: "Validation v2 campaign blocked because the requested objective contained unsafe procedure content.",
        allowed: false,
        metadata: {
          scopeId: input.scopeId,
          target: input.target,
          templateIds: input.templateIds,
          unsafeMatches
        }
      });
      return reply.code(403).send({
        error: "unsafe_validation_objective",
        warnings: unsafeMatches,
        audit
      });
    }

    const created = await deps.validationService.createCampaignV2(input);
    if (!created.allowed) {
      const audit = await deps.auditService.record({
        action: "validation.v2_campaign_blocked",
        summary: `Validation v2 campaign blocked: ${created.reason}.`,
        allowed: false,
        metadata: {
          scopeId: input.scopeId,
          target: input.target,
          templateIds: input.templateIds,
          reason: created.reason,
          warnings: created.warnings
        }
      });
      return reply.code(403).send({
        error: created.reason,
        warnings: created.warnings,
        audit
      });
    }

    const audit = await deps.auditService.record({
      action: "validation.v2_campaign_created",
      summary: `Created lab validation campaign for ${created.campaign.target}.`,
      allowed: true,
      metadata: {
        campaignId: created.campaign.id,
        scopeId: created.campaign.scopeId,
        target: created.campaign.target,
        templateIds: created.campaign.templateIds,
        warnings: created.warnings
      }
    });

    return {
      validationCampaign: created.campaign,
      templates: created.templates,
      warnings: created.warnings,
      audit
    };
  });

  app.get("/validation/v2/campaigns/:id", async (request, reply) => {
    const params = campaignParamsSchema.parse(request.params);
    const campaign = await deps.validationService.getCampaignV2(params.id);
    if (!campaign) {
      return reply.code(404).send({ error: "validation_campaign_v2_not_found" });
    }

    return campaign;
  });

  app.post("/validation/v2/campaigns/:id/replay", async (request, reply) => {
    const params = campaignParamsSchema.parse(request.params);
    const replay = await deps.validationService.replayCampaignV2(params.id);
    if (!replay) {
      return reply.code(404).send({ error: "validation_campaign_v2_not_found" });
    }

    const audit = await deps.auditService.record({
      action: "validation.v2_replay_generated",
      summary: `Generated ${replay.replayedTelemetry.length} benign telemetry replay event${replay.replayedTelemetry.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        campaignId: params.id,
        evidenceIds: replay.replayedTelemetry.map((event) => event.evidenceId)
      }
    });

    return {
      validationCampaign: replay.campaign,
      replayedTelemetry: replay.replayedTelemetry,
      audit
    };
  });

  app.get("/validation/v2/campaigns/:id/evidence-report", async (request, reply) => {
    const params = campaignParamsSchema.parse(request.params);
    const report = await deps.validationService.buildEvidenceReportV2(params.id);
    if (!report) {
      return reply.code(404).send({ error: "validation_campaign_v2_not_found" });
    }

    const audit = await deps.auditService.record({
      action: "validation.v2_evidence_report_created",
      summary: `Created validation evidence report with ${report.report.gaps.length} gap${report.report.gaps.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        campaignId: params.id,
        reportId: report.report.id,
        gapCount: report.report.gaps.length,
        citationCount: report.report.citations.length
      }
    });

    return {
      validationCampaign: report.campaign,
      evidenceReport: report.report,
      audit
    };
  });

  app.get("/validation/scopes", async () => ({
    authorizationScopes: await deps.validationService.listScopes(),
    objectiveTemplates: getValidationObjectiveTemplates()
  }));

  app.post("/validation/scopes", async (request) => {
    const input = createAuthorizationScopeSchema.parse(request.body);
    const scope = await deps.validationService.createScope(input);
    const audit = await deps.auditService.record({
      action: "validation.scope_created",
      summary: `Created authorization scope ${scope.name}.`,
      allowed: true,
      metadata: {
        scopeId: scope.id,
        expiresAt: scope.expiresAt,
        assetCount: scope.assets.length
      }
    });

    return {
      authorizationScope: scope,
      audit
    };
  });

  app.post("/validation/campaigns", async (request, reply) => {
    const input = createValidationCampaignSchema.parse(request.body);
    const unsafeMatches = assertSafeValidationText(input.requestedSteps);
    if (unsafeMatches.length > 0) {
      const audit = await deps.auditService.record({
        action: "validation.campaign_blocked",
        summary: "Validation campaign blocked because requested steps contained unsafe procedure content.",
        allowed: false,
        metadata: {
          scopeId: input.scopeId,
          unsafeMatches
        }
      });
      return reply.code(403).send({
        error: "unsafe_validation_steps",
        reason: "Validation campaigns may only use high-level objectives, telemetry expectations, and approved benign evidence.",
        unsafeMatches,
        audit
      });
    }

    const created = await deps.validationService.createCampaign(input);
    if (!created.allowed) {
      const audit = await deps.auditService.record({
        action: "validation.campaign_blocked",
        summary: `Validation campaign blocked: ${created.reason}.`,
        allowed: false,
        metadata: {
          scopeId: input.scopeId,
          reason: created.reason,
          warnings: created.warnings
        }
      });
      return reply.code(409).send({
        error: created.reason,
        warnings: created.warnings,
        audit
      });
    }

    const audit = await deps.auditService.record({
      action: "validation.campaign_created",
      summary: `Created validation campaign ${created.campaign.objective}.`,
      allowed: true,
      metadata: {
        campaignId: created.campaign.id,
        scopeId: created.campaign.scopeId,
        objectiveCount: created.objectives.length,
        expectationCount: created.expectations.length
      }
    });

    return {
      validationCampaign: created.campaign,
      validationObjectives: created.objectives,
      telemetryExpectations: created.expectations,
      audit
    };
  });

  app.get("/validation/campaigns/:id", async (request, reply) => {
    const params = campaignParamsSchema.parse(request.params);
    const campaign = await deps.validationService.getCampaign(params.id);
    if (!campaign) {
      return reply.code(404).send({ error: "validation_campaign_not_found" });
    }

    return campaign;
  });

  app.post("/validation/campaigns/:id/results", async (request, reply) => {
    const params = campaignParamsSchema.parse(request.params);
    const input = createValidationResultSchema.parse(request.body);
    const result = await deps.validationService.recordResult(params.id, input);
    if (!result) {
      return reply.code(404).send({ error: "validation_campaign_not_found" });
    }

    const audit = await deps.auditService.record({
      action: "validation.result_recorded",
      summary: `Recorded validation result ${result.result.status}.`,
      allowed: true,
      metadata: {
        campaignId: params.id,
        resultId: result.result.id,
        gapCount: result.result.gaps.length,
        remediationTaskCount: result.result.remediationTasks.length
      }
    });

    return {
      validationResult: result.result,
      audit
    };
  });
}
