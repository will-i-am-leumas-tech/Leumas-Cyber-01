import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildRedactedArtifact } from "../privacy/redaction-service";
import { classifySensitiveData, detectSensitiveData, summarizeSensitiveFindings } from "../privacy/sensitive-data-detector";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

interface PrivacyRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const privacyScanBodySchema = z.object({
  text: z.string().optional(),
  json: z.unknown().optional(),
  sourceRef: z.string().min(1).default("privacy-scan")
});

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

function bodyToText(body: z.infer<typeof privacyScanBodySchema>): string {
  return [body.text, body.json === undefined ? undefined : JSON.stringify(body.json, null, 2)]
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .join("\n\n");
}

export function registerPrivacyRoutes(app: FastifyInstance, deps: PrivacyRouteDeps): void {
  app.post("/privacy/scan", async (request) => {
    const body = privacyScanBodySchema.parse(request.body);
    const text = bodyToText(body);
    const findings = detectSensitiveData(text, body.sourceRef);
    const dataClass = classifySensitiveData(findings);

    return {
      findings,
      summary: summarizeSensitiveFindings(findings),
      dataClassification: {
        dataClass,
        reason:
          findings.length > 0
            ? `Detected sensitive data types: ${Object.keys(summarizeSensitiveFindings(findings)).join(", ")}.`
            : "No sensitive values matched the MVP privacy detector."
      },
      redactedArtifact: buildRedactedArtifact({
        originalRef: body.sourceRef,
        text,
        findings
      })
    };
  });

  app.post("/cases/:id/redact", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const sourceRef = `case:${params.id}:report`;
    const text = [cyberCase.summary, cyberCase.reportMarkdown].join("\n\n");
    const findings = detectSensitiveData(text, sourceRef);
    const dataClass = classifySensitiveData(findings);
    const redactedArtifact = buildRedactedArtifact({
      originalRef: sourceRef,
      text,
      findings
    });
    const classification = {
      id: createId("data_classification"),
      resourceRef: sourceRef,
      dataClass,
      reason:
        findings.length > 0
          ? `Detected sensitive data types: ${Object.keys(summarizeSensitiveFindings(findings)).join(", ")}.`
          : "No sensitive values matched the MVP privacy detector.",
      createdAt: nowIso()
    };
    const privacyAudit = {
      id: createId("privacy_audit"),
      caseId: params.id,
      action: findings.length > 0 ? "privacy.case_redacted" : "privacy.case_scan_clean",
      dataClass,
      findingCount: findings.length,
      summary:
        findings.length > 0
          ? `Prepared case redaction for ${findings.length} sensitive value${findings.length === 1 ? "" : "s"}.`
          : "Case privacy scan found no sensitive values.",
      timestamp: nowIso()
    };

    cyberCase.sensitiveFindings.push(...findings);
    cyberCase.redactedArtifacts.push(redactedArtifact);
    cyberCase.dataClassifications.push(classification);
    cyberCase.privacyAuditEvents.push(privacyAudit);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "privacy.case_redacted",
      summary: `Prepared case privacy redaction with ${findings.length} sensitive finding${findings.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        findingTypes: summarizeSensitiveFindings(findings),
        dataClass,
        sourceRef
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      findings,
      redactedArtifact,
      dataClassification: classification,
      privacyAuditEvent: privacyAudit,
      case: cyberCase
    };
  });

  app.get("/cases/:id/privacy", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      sensitiveFindings: cyberCase.sensitiveFindings,
      redactedArtifacts: cyberCase.redactedArtifacts,
      promptPackages: cyberCase.promptPackages,
      dataClassifications: cyberCase.dataClassifications,
      privacyAuditEvents: cyberCase.privacyAuditEvents
    };
  });
}
