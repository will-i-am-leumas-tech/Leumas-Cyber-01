import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { validateReportCitations } from "../reports/citation-validator";
import { createReportDraft, updateReportDraft } from "../reports/report-draft-service";
import { redactReportDraft } from "../reports/redaction-service";
import { getReportTemplate, getReportTemplates } from "../reports/template-registry";
import type { CyberCase } from "../schemas/case.schema";
import { reportAudienceSchema, reportStatusSchema } from "../schemas/reports.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { validateRequiredReportSections } from "../services/report-service";
import { nowIso } from "../utils/time";

interface ReportRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

const reportParamsSchema = z.object({
  id: z.string().min(1),
  reportId: z.string().min(1)
});

const createReportBodySchema = z
  .object({
    templateId: z.string().min(1).optional(),
    actor: z.string().min(1).optional()
  })
  .default({});

const patchReportBodySchema = z.object({
  contentMarkdown: z.string().min(1).optional(),
  status: reportStatusSchema.optional(),
  editor: z.string().min(1).optional(),
  diffSummary: z.string().min(1).optional()
});

const redactReportBodySchema = z
  .object({
    audience: reportAudienceSchema.optional()
  })
  .default({});

function templatesForCase(cyberCase: CyberCase) {
  return cyberCase.reportTemplates.length > 0 ? cyberCase.reportTemplates : getReportTemplates();
}

export function registerReportRoutes(app: FastifyInstance, deps: ReportRouteDeps): void {
  app.get("/cases/:id/reports", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      reportTemplates: templatesForCase(cyberCase),
      reportDrafts: cyberCase.reportDrafts,
      reportVersions: cyberCase.reportVersions,
      reportCitations: cyberCase.reportCitations,
      redactionResults: cyberCase.redactionResults
    };
  });

  app.post("/cases/:id/reports", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const body = createReportBodySchema.parse(request.body ?? {});
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }
    if (!cyberCase.result) {
      return reply.code(409).send({ error: "case_has_no_analysis_result" });
    }

    const templates = templatesForCase(cyberCase);
    const templateId = body.templateId ?? "technical-template";
    const template = templates.find((candidate) => candidate.id === templateId) ?? (body.templateId ? undefined : getReportTemplate("technical-template"));
    if (!template) {
      return reply.code(404).send({ error: "report_template_not_found" });
    }

    if (cyberCase.reportTemplates.length === 0) {
      cyberCase.reportTemplates = getReportTemplates();
    }

    const { draft, version, citations } = createReportDraft(cyberCase, {
      template,
      actor: body.actor
    });
    const sectionWarnings = validateRequiredReportSections(template, draft.contentMarkdown);
    if (sectionWarnings.length > 0) {
      return reply.code(500).send({ error: "generated_report_missing_required_sections", warnings: sectionWarnings });
    }

    const citationValidation = validateReportCitations(cyberCase, citations);
    cyberCase.reportDrafts.push(draft);
    cyberCase.reportVersions.push(version);
    cyberCase.reportCitations.push(...citations);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "report.created",
      summary: `Created ${template.name} report draft.`,
      allowed: citationValidation.passed,
      metadata: {
        reportId: draft.id,
        templateId: template.id,
        citationCount: citations.length,
        citationWarnings: citationValidation.warnings
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      reportDraft: draft,
      reportVersion: version,
      citationValidation,
      case: cyberCase
    };
  });

  app.get("/cases/:id/reports/:reportId", async (request, reply) => {
    const params = reportParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const reportDraft = cyberCase.reportDrafts.find((draft) => draft.id === params.reportId);
    if (!reportDraft) {
      return reply.code(404).send({ error: "report_not_found" });
    }

    return {
      reportDraft,
      versions: cyberCase.reportVersions.filter((version) => version.draftId === params.reportId),
      citations: cyberCase.reportCitations.filter((citation) => citation.reportId === params.reportId),
      redactions: cyberCase.redactionResults.filter((redaction) => redaction.reportId === params.reportId)
    };
  });

  app.patch("/cases/:id/reports/:reportId", async (request, reply) => {
    const params = reportParamsSchema.parse(request.params);
    const body = patchReportBodySchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const currentDraft = cyberCase.reportDrafts.find((draft) => draft.id === params.reportId);
    if (!currentDraft) {
      return reply.code(404).send({ error: "report_not_found" });
    }

    const template = templatesForCase(cyberCase).find((candidate) => candidate.id === currentDraft.templateId);
    if (!template) {
      return reply.code(409).send({ error: "report_template_not_found" });
    }

    const nextContent = body.contentMarkdown ?? currentDraft.contentMarkdown;
    const sectionWarnings = validateRequiredReportSections(template, nextContent);
    if (sectionWarnings.length > 0) {
      return reply.code(400).send({ error: "missing_required_report_sections", warnings: sectionWarnings });
    }

    const citationValidation = validateReportCitations(cyberCase, currentDraft.citations);
    if (body.status === "approved" && !citationValidation.passed) {
      return reply.code(409).send({ error: "citations_invalid", warnings: citationValidation.warnings });
    }

    const updated = updateReportDraft(cyberCase, params.reportId, body);
    if (!updated) {
      return reply.code(404).send({ error: "report_not_found" });
    }
    cyberCase.reportVersions.push(updated.version);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "report.updated",
      summary: `Updated report ${params.reportId}.`,
      allowed: citationValidation.passed,
      metadata: {
        reportId: params.reportId,
        version: updated.version.version,
        status: updated.draft.status,
        citationWarnings: citationValidation.warnings
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      reportDraft: updated.draft,
      reportVersion: updated.version,
      citationValidation,
      case: cyberCase
    };
  });

  app.post("/cases/:id/reports/:reportId/redact", async (request, reply) => {
    const params = reportParamsSchema.parse(request.params);
    const body = redactReportBodySchema.parse(request.body ?? {});
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const reportDraft = cyberCase.reportDrafts.find((draft) => draft.id === params.reportId);
    if (!reportDraft) {
      return reply.code(404).send({ error: "report_not_found" });
    }

    const redaction = redactReportDraft(reportDraft, body.audience ?? "external");
    cyberCase.redactionResults.push(redaction);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "report.redacted",
      summary: `Created ${redaction.audience} redaction preview for report ${params.reportId}.`,
      allowed: true,
      metadata: {
        reportId: params.reportId,
        audience: redaction.audience,
        redactedFields: redaction.redactedFields
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      redaction,
      case: cyberCase
    };
  });
}
