import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createStandardOrchestration } from "../agents/agent-orchestrator";
import { arbitrateAgentResults } from "../agents/arbitration-service";
import { listAgentRoleContracts } from "../agents/agent-role-registry";
import { agentRoles } from "../agents/agent-task-service";
import { buildOperatorOverride } from "../agents/operator-override-service";
import { createOperatorOverrideSchema } from "../schemas/agents-v2.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { nowIso } from "../utils/time";

interface AgentRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

const orchestrationParamsSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1)
});

const createOrchestrationBodySchema = z
  .object({
    plan: z.string().min(1).default("standard-log-plan")
  })
  .default({});

export function registerAgentRoutes(app: FastifyInstance, deps: AgentRouteDeps): void {
  app.get("/agents/roles", async () => ({
    agentRoles,
    roleContracts: listAgentRoleContracts()
  }));

  app.post("/cases/:id/orchestrations", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const body = createOrchestrationBodySchema.parse(request.body ?? {});
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }
    if (!cyberCase.result) {
      return reply.code(409).send({ error: "case_has_no_analysis_result" });
    }

    const orchestration = createStandardOrchestration(cyberCase, body.plan);
    cyberCase.agentRoles = agentRoles;
    cyberCase.agentTasks.push(...orchestration.tasks);
    cyberCase.agentResults.push(...orchestration.results);
    cyberCase.orchestrationRuns.push(orchestration.run);
    cyberCase.arbitrationResults.push(orchestration.arbitration);
    cyberCase.agentRoleContracts = listAgentRoleContracts();
    cyberCase.agentTraces.push(...orchestration.traces);
    cyberCase.agentMemoryItems.push(...orchestration.memoryItems);
    cyberCase.reviewerFindings.push(orchestration.reviewerFinding);
    cyberCase.arbitrationResultsV2.push(orchestration.arbitrationV2);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "agents.orchestration_completed",
      summary: `Agent orchestration ${orchestration.run.finalStatus} using ${orchestration.tasks.length} bounded tasks.`,
      allowed: orchestration.run.finalStatus === "completed",
      metadata: {
        runId: orchestration.run.id,
        taskIds: orchestration.run.taskIds,
        arbitrationStatus: orchestration.arbitration.validationStatus,
        conflicts: orchestration.arbitration.conflicts,
        traceIds: orchestration.traces.map((trace) => trace.id),
        reviewerFindingId: orchestration.reviewerFinding.id
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      orchestrationRun: orchestration.run,
      agentTasks: orchestration.tasks,
      agentResults: orchestration.results,
      arbitrationResult: orchestration.arbitration,
      agentTraces: orchestration.traces,
      agentMemoryItems: orchestration.memoryItems,
      reviewerFinding: orchestration.reviewerFinding,
      arbitrationResultV2: orchestration.arbitrationV2,
      case: cyberCase
    };
  });

  app.post("/cases/:id/agents/investigate", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const body = createOrchestrationBodySchema.parse(request.body ?? {});
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }
    if (!cyberCase.result) {
      return reply.code(409).send({ error: "case_has_no_analysis_result" });
    }

    const orchestration = createStandardOrchestration(cyberCase, body.plan);
    cyberCase.agentRoles = agentRoles;
    cyberCase.agentRoleContracts = listAgentRoleContracts();
    cyberCase.agentTasks.push(...orchestration.tasks);
    cyberCase.agentResults.push(...orchestration.results);
    cyberCase.orchestrationRuns.push(orchestration.run);
    cyberCase.arbitrationResults.push(orchestration.arbitration);
    cyberCase.agentTraces.push(...orchestration.traces);
    cyberCase.agentMemoryItems.push(...orchestration.memoryItems);
    cyberCase.reviewerFindings.push(orchestration.reviewerFinding);
    cyberCase.arbitrationResultsV2.push(orchestration.arbitrationV2);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "agents.v2_investigation_completed",
      summary: `Agent v2 investigation ${orchestration.run.finalStatus} with ${orchestration.traces.length} trace records.`,
      allowed: orchestration.run.finalStatus === "completed",
      metadata: {
        runId: orchestration.run.id,
        traceIds: orchestration.traces.map((trace) => trace.id),
        reviewerStatus: orchestration.reviewerFinding.status,
        arbitrationId: orchestration.arbitrationV2.id
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      orchestrationRun: orchestration.run,
      agentTasks: orchestration.tasks,
      agentResults: orchestration.results,
      agentTraces: orchestration.traces,
      agentMemoryItems: orchestration.memoryItems,
      reviewerFinding: orchestration.reviewerFinding,
      arbitrationResult: orchestration.arbitrationV2,
      case: cyberCase
    };
  });

  app.get("/cases/:id/orchestrations/:runId", async (request, reply) => {
    const params = orchestrationParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const run = cyberCase.orchestrationRuns.find((candidate) => candidate.id === params.runId);
    if (!run) {
      return reply.code(404).send({ error: "orchestration_not_found" });
    }

    return {
      orchestrationRun: run,
      agentTasks: cyberCase.agentTasks.filter((task) => task.runId === run.id),
      agentResults: cyberCase.agentResults.filter((result) => run.taskIds.includes(result.taskId)),
      arbitrationResult: cyberCase.arbitrationResults.find((result) => result.runId === run.id),
      agentTraces: cyberCase.agentTraces.filter((trace) => trace.runId === run.id),
      reviewerFinding: cyberCase.reviewerFindings.find((finding) => finding.runId === run.id),
      arbitrationResultV2: cyberCase.arbitrationResultsV2.find((result) => result.runId === run.id)
    };
  });

  app.get("/cases/:id/agents/traces", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      agentTraces: cyberCase.agentTraces,
      reviewerFindings: cyberCase.reviewerFindings,
      agentMemoryItems: cyberCase.agentMemoryItems
    };
  });

  app.post("/cases/:id/agents/arbitrate", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const latestRun = cyberCase.orchestrationRuns.at(-1);
    const result = arbitrateAgentResults({
      cyberCase,
      runId: latestRun?.id,
      results: latestRun ? cyberCase.agentResults.filter((agentResult) => latestRun.taskIds.includes(agentResult.taskId)) : cyberCase.agentResults,
      reviewer: latestRun ? cyberCase.reviewerFindings.find((finding) => finding.runId === latestRun.id) : undefined
    });
    cyberCase.arbitrationResultsV2.push(result);
    cyberCase.updatedAt = nowIso();
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "agents.v2_arbitration_recorded",
      summary: `Agent v2 arbitration ${result.reviewerStatus}.`,
      allowed: result.reviewerStatus === "passed",
      metadata: {
        arbitrationId: result.id,
        conflictRefs: result.conflictRefs
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      arbitrationResult: result,
      case: cyberCase
    };
  });

  app.post("/cases/:id/agents/overrides", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const input = createOperatorOverrideSchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const override = buildOperatorOverride(params.id, input);
    cyberCase.operatorOverrides.push(override);
    cyberCase.updatedAt = nowIso();
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "agents.operator_override_recorded",
      summary: `Operator override ${override.decision}: ${override.reason}.`,
      allowed: override.decision === "approve",
      metadata: {
        overrideId: override.id,
        actor: override.actor,
        affectedFindingIds: override.affectedFindingIds
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      operatorOverride: override,
      case: cyberCase
    };
  });

  app.get("/cases/:id/agent-tasks", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      agentRoles: cyberCase.agentRoles.length > 0 ? cyberCase.agentRoles : agentRoles,
      agentTasks: cyberCase.agentTasks,
      agentResults: cyberCase.agentResults,
      orchestrationRuns: cyberCase.orchestrationRuns,
      arbitrationResults: cyberCase.arbitrationResults,
      agentRoleContracts: cyberCase.agentRoleContracts,
      agentTraces: cyberCase.agentTraces,
      reviewerFindings: cyberCase.reviewerFindings,
      arbitrationResultsV2: cyberCase.arbitrationResultsV2,
      operatorOverrides: cyberCase.operatorOverrides
    };
  });
}
