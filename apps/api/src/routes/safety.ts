import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analysisModeSchema } from "../schemas/input.schema";
import { detectPromptInjection } from "../safety/prompt-injection-detector";
import { evaluateSafetyPolicy } from "../safety/policy-engine";
import { validateOutputSafety } from "../safety/output-validator";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";

interface SafetyRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

const evaluateSafetyBodySchema = z.object({
  mode: analysisModeSchema,
  text: z.string().min(1),
  outputText: z.string().optional()
});

export function registerSafetyRoutes(app: FastifyInstance, deps: SafetyRouteDeps): void {
  app.get("/cases/:id/safety", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      safetyDecisions: cyberCase.safetyDecisions,
      policyVersions: cyberCase.policyVersions,
      promptInjectionFindings: cyberCase.promptInjectionFindings,
      outputSafetyResults: cyberCase.outputSafetyResults
    };
  });

  app.post("/safety/evaluate", async (request) => {
    const body = evaluateSafetyBodySchema.parse(request.body);
    const decision = evaluateSafetyPolicy({
      mode: body.mode,
      text: body.text
    });
    const promptInjectionFindings = detectPromptInjection(body.text, "safety:evaluate");
    const outputSafety = body.outputText ? validateOutputSafety(body.outputText) : undefined;

    await deps.auditService.record({
      action: "safety.evaluated",
      summary: `Evaluated ${body.mode} input against safety policy.`,
      allowed: decision.allowed,
      metadata: {
        decisionId: decision.id,
        category: decision.category,
        policyVersion: decision.policyVersion,
        promptInjectionCount: promptInjectionFindings.length,
        outputAllowed: outputSafety?.allowed
      }
    });

    return {
      decision,
      promptInjectionFindings,
      outputSafety
    };
  });
}
