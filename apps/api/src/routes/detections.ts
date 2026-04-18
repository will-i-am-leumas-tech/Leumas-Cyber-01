import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildCorpusItems, corpusItemFromRuleTestCase, runDetectionCorpus } from "../detections/detection-corpus-service";
import { buildDetectionIntent } from "../detections/detection-intent-builder";
import { buildDetectionRuleV2Variants } from "../detections/detection-rule-v2-builder";
import { createDetectionDeployment } from "../detections/deployment-tracker";
import { simulateFalsePositives } from "../detections/false-positive-simulator";
import { listRuleFormats } from "../detections/rule-format-registry";
import { validateRuleV2 } from "../detections/rule-validator";
import { runRuleTests, validateDetectionRule } from "../detections/rule-test-runner";
import { buildSigmaLikeRule } from "../detections/sigma-rule-builder";
import { ruleTestCaseSchema } from "../schemas/detections.schema";
import {
  detectionCorpusItemSchema,
  detectionDeploymentRequestSchema,
  detectionRuleValidationRequestSchema,
  type CoverageSummary,
  type DetectionRuleV2
} from "../schemas/detections-v2.schema";
import type { CyberCase } from "../schemas/case.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { nowIso } from "../utils/time";

interface DetectionRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

const detectionParamsSchema = z.object({
  id: z.string().min(1),
  detectionId: z.string().min(1)
});

const testCasesBodySchema = z.object({
  testCases: z.array(ruleTestCaseSchema).min(1)
});

const corpusBodySchema = z.object({
  corpusItems: z.array(detectionCorpusItemSchema.omit({ id: true, createdAt: true })).default([]),
  testCases: z.array(ruleTestCaseSchema).default([])
});

function findRuleV2(cyberCase: CyberCase, sourceRuleId: string, format?: DetectionRuleV2["format"]): DetectionRuleV2 | null {
  return (
    cyberCase.detectionRulesV2.find(
      (rule) => (rule.sourceRuleId === sourceRuleId || rule.id === sourceRuleId) && (!format || rule.format === format)
    ) ?? null
  );
}

function count(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((summary, value) => {
    summary[value] = (summary[value] ?? 0) + 1;
    return summary;
  }, {});
}

function buildCoverageSummary(cyberCase: CyberCase): CoverageSummary {
  return {
    totalRules: cyberCase.detectionRulesV2.length,
    formats: count(cyberCase.detectionRulesV2.map((rule) => rule.format)),
    techniques: count(cyberCase.detectionRulesV2.flatMap((rule) => rule.metadata.attackTechniques)),
    dataSources: count(cyberCase.detectionRulesV2.flatMap((rule) => rule.metadata.dataSources)),
    deploymentStatuses: count(cyberCase.detectionDeployments.map((deployment) => deployment.status))
  };
}

export function registerDetectionRoutes(app: FastifyInstance, deps: DetectionRouteDeps): void {
  app.get("/detections/formats", async () => ({
    formats: listRuleFormats()
  }));

  app.get("/cases/:id/detections", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      detectionIntents: cyberCase.detectionIntents,
      detectionRules: cyberCase.detectionRules,
      detectionRulesV2: cyberCase.detectionRulesV2,
      ruleTestCases: cyberCase.ruleTestCases,
      ruleValidationResults: cyberCase.ruleValidationResults,
      detectionCorpusItems: cyberCase.detectionCorpusItems,
      corpusRunResults: cyberCase.corpusRunResults,
      ruleValidationResultsV2: cyberCase.ruleValidationResultsV2,
      falsePositiveResults: cyberCase.falsePositiveResults,
      detectionDeployments: cyberCase.detectionDeployments,
      coverage: buildCoverageSummary(cyberCase)
    };
  });

  app.post("/cases/:id/detections", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    if (!cyberCase.result) {
      return reply.code(409).send({ error: "case_has_no_analysis_result" });
    }

    const intent = buildDetectionIntent(cyberCase, cyberCase.detectionIntents.length + 1);
    const rule = buildSigmaLikeRule(intent, cyberCase.detectionRules.length + 1);
    const ruleV2 = buildDetectionRuleV2Variants({
      intent,
      rule,
      indexStart: cyberCase.detectionRulesV2.length
    });
    cyberCase.detectionIntents.push(intent);
    cyberCase.detectionRules.push(rule);
    cyberCase.detectionRulesV2.push(...ruleV2);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "detection.generated",
      summary: `Generated detection rule: ${rule.title}.`,
      allowed: true,
      metadata: {
        intentId: intent.id,
        ruleId: rule.id,
        ruleV2Ids: ruleV2.map((candidate) => candidate.id),
        dataSources: intent.dataSources,
        evidenceRefs: intent.evidenceRefs
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      detectionIntent: intent,
      detectionRule: rule,
      detectionRulesV2: ruleV2,
      case: cyberCase
    };
  });

  app.get("/cases/:id/detections/coverage", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      coverage: buildCoverageSummary(cyberCase)
    };
  });

  app.post("/cases/:id/detections/:detectionId/validate", async (request, reply) => {
    const params = detectionParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const ruleIndex = cyberCase.detectionRules.findIndex((rule) => rule.id === params.detectionId);
    if (ruleIndex === -1) {
      return reply.code(404).send({ error: "detection_not_found" });
    }

    const validation = validateDetectionRule(cyberCase.detectionRules[ruleIndex]);
    cyberCase.detectionRules[ruleIndex] = {
      ...cyberCase.detectionRules[ruleIndex],
      validationStatus: validation.passed ? "passed" : "failed"
    };
    cyberCase.ruleValidationResults.push(validation);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "detection.validated",
      summary: `Detection validation ${validation.passed ? "passed" : "failed"} for ${params.detectionId}.`,
      allowed: validation.passed,
      metadata: {
        ruleId: params.detectionId,
        warnings: validation.warnings
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      validation,
      detectionRule: cyberCase.detectionRules[ruleIndex]
    };
  });

  app.post("/cases/:id/detections/:detectionId/test", async (request, reply) => {
    const params = detectionParamsSchema.parse(request.params);
    const body = testCasesBodySchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const ruleIndex = cyberCase.detectionRules.findIndex((rule) => rule.id === params.detectionId);
    if (ruleIndex === -1) {
      return reply.code(404).send({ error: "detection_not_found" });
    }

    const validation = runRuleTests(cyberCase.detectionRules[ruleIndex], body.testCases);
    cyberCase.ruleTestCases.push(...body.testCases);
    cyberCase.ruleValidationResults.push(validation);
    cyberCase.detectionRules[ruleIndex] = {
      ...cyberCase.detectionRules[ruleIndex],
      validationStatus: validation.passed ? "passed" : "failed"
    };
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "detection.tested",
      summary: `Detection fixture tests ${validation.passed ? "passed" : "failed"} for ${params.detectionId}.`,
      allowed: validation.passed,
      metadata: {
        ruleId: params.detectionId,
        testCount: body.testCases.length,
        failedTests: validation.testResults.filter((result) => !result.passed).map((result) => result.testCaseId)
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      validation,
      detectionRule: cyberCase.detectionRules[ruleIndex]
    };
  });

  app.post("/cases/:id/detections/:detectionId/v2/validate", async (request, reply) => {
    const params = detectionParamsSchema.parse(request.params);
    const body = detectionRuleValidationRequestSchema.parse(request.body ?? {});
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const rule = findRuleV2(cyberCase, params.detectionId, body.format);
    if (!rule) {
      return reply.code(404).send({ error: "detection_rule_v2_not_found" });
    }

    const validation = validateRuleV2(rule);
    const index = cyberCase.detectionRulesV2.findIndex((candidate) => candidate.id === rule.id);
    cyberCase.detectionRulesV2[index] = {
      ...rule,
      status: validation.passed ? "validated" : "draft",
      validationIds: [...rule.validationIds, validation.id],
      updatedAt: nowIso()
    };
    cyberCase.ruleValidationResultsV2.push(validation);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "detection.v2_validated",
      summary: `Detection v2 ${rule.format} validation ${validation.passed ? "passed" : "failed"} for ${rule.id}.`,
      allowed: validation.passed,
      metadata: {
        ruleId: rule.id,
        sourceRuleId: rule.sourceRuleId,
        format: rule.format,
        warnings: validation.warnings
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      validation,
      detectionRuleV2: cyberCase.detectionRulesV2[index]
    };
  });

  app.post("/cases/:id/detections/:detectionId/test-corpus", async (request, reply) => {
    const params = detectionParamsSchema.parse(request.params);
    const body = corpusBodySchema.parse(request.body ?? {});
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const rule = cyberCase.detectionRules.find((candidate) => candidate.id === params.detectionId);
    if (!rule) {
      return reply.code(404).send({ error: "detection_not_found" });
    }

    const newCorpusItems = [
      ...buildCorpusItems(body.corpusItems),
      ...body.testCases.map((testCase) => corpusItemFromRuleTestCase(testCase))
    ];
    const corpusItems = newCorpusItems.length > 0 ? newCorpusItems : cyberCase.detectionCorpusItems;
    const run = runDetectionCorpus(rule, corpusItems);
    cyberCase.detectionCorpusItems.push(...newCorpusItems);
    cyberCase.corpusRunResults.push(run);
    cyberCase.detectionRulesV2 = cyberCase.detectionRulesV2.map((candidate) =>
      candidate.sourceRuleId === rule.id
        ? {
            ...candidate,
            status: run.passed ? "testing" : "draft",
            corpusItemIds: [...new Set([...candidate.corpusItemIds, ...corpusItems.map((item) => item.id)])],
            updatedAt: nowIso()
          }
        : candidate
    );
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "detection.corpus_tested",
      summary: `Detection corpus tests ${run.passed ? "passed" : "failed"} for ${rule.id}.`,
      allowed: run.passed,
      metadata: {
        ruleId: rule.id,
        corpusItemCount: corpusItems.length,
        failedCorpusItems: run.results.filter((result) => !result.passed).map((result) => result.corpusItemId)
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      corpusRun: run,
      corpusItems,
      detectionRulesV2: cyberCase.detectionRulesV2.filter((candidate) => candidate.sourceRuleId === rule.id)
    };
  });

  app.post("/cases/:id/detections/:detectionId/simulate-false-positives", async (request, reply) => {
    const params = detectionParamsSchema.parse(request.params);
    const body = corpusBodySchema.parse(request.body ?? {});
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const rule = cyberCase.detectionRules.find((candidate) => candidate.id === params.detectionId);
    if (!rule) {
      return reply.code(404).send({ error: "detection_not_found" });
    }

    const newCorpusItems = [
      ...buildCorpusItems(body.corpusItems),
      ...body.testCases.map((testCase) => corpusItemFromRuleTestCase(testCase))
    ];
    const corpusItems = newCorpusItems.length > 0 ? newCorpusItems : cyberCase.detectionCorpusItems;
    const simulation = simulateFalsePositives(rule, corpusItems);
    cyberCase.detectionCorpusItems.push(...newCorpusItems);
    cyberCase.falsePositiveResults.push(simulation);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "detection.false_positives_simulated",
      summary: `False-positive simulation found ${simulation.benignCorpusMatches}/${simulation.benignCorpusTotal} benign matches.`,
      allowed: simulation.riskScore < 0.5,
      metadata: {
        ruleId: rule.id,
        riskScore: simulation.riskScore,
        matchedCorpusItemIds: simulation.matchedCorpusItemIds
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      simulation,
      corpusItems
    };
  });

  app.post("/cases/:id/detections/:detectionId/deployments", async (request, reply) => {
    const params = detectionParamsSchema.parse(request.params);
    const input = detectionDeploymentRequestSchema.parse(request.body ?? {});
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const rule = findRuleV2(cyberCase, params.detectionId);
    if (!rule) {
      return reply.code(404).send({ error: "detection_rule_v2_not_found" });
    }

    const deployment = createDetectionDeployment(rule, input);
    cyberCase.detectionDeployments.push(deployment);
    cyberCase.detectionRulesV2 = cyberCase.detectionRulesV2.map((candidate) =>
      candidate.id === rule.id
        ? {
            ...candidate,
            status: deployment.status === "deployed" ? "deployed" : candidate.status,
            deploymentIds: [...candidate.deploymentIds, deployment.id],
            updatedAt: nowIso()
          }
        : candidate
    );
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "detection.deployment_recorded",
      summary: `Recorded ${deployment.status} deployment for ${rule.format} rule ${rule.id}.`,
      allowed: true,
      metadata: {
        ruleId: rule.id,
        backend: deployment.backend,
        status: deployment.status,
        owner: deployment.owner
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      deployment,
      detectionRuleV2: cyberCase.detectionRulesV2.find((candidate) => candidate.id === rule.id)
    };
  });
}
