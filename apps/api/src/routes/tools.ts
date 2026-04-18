import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getConnector, listConnectors } from "../tools/connector-registry";
import { runToolCall } from "../tools/tool-runner";
import { toolCallRequestSchema } from "../schemas/tools.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { nowIso } from "../utils/time";

interface ToolRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const connectorParamsSchema = z.object({
  connectorId: z.string().min(1)
});

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

export function registerToolRoutes(app: FastifyInstance, deps: ToolRouteDeps): void {
  app.get("/tools/connectors", async () => ({
    connectors: listConnectors()
  }));

  app.post("/tools/:connectorId/health", async (request, reply) => {
    const params = connectorParamsSchema.parse(request.params);
    const connector = getConnector(params.connectorId);
    if (!connector) {
      return reply.code(404).send({ error: "connector_not_found" });
    }

    return connector.healthCheck();
  });

  app.get("/cases/:id/tool-calls", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      toolCalls: cyberCase.toolCalls,
      toolResults: cyberCase.toolResults
    };
  });

  app.post("/cases/:id/tool-calls", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const toolRequest = toolCallRequestSchema.parse(request.body);
    const run = await runToolCall({
      caseId: params.id,
      request: toolRequest,
      index: cyberCase.toolCalls.length + 1
    });
    cyberCase.toolCalls.push(run.toolCall);
    if (run.sandboxRun) {
      cyberCase.sandboxRuns.push(run.sandboxRun);
    }
    if (run.sandboxArtifacts) {
      cyberCase.sandboxArtifacts.push(...run.sandboxArtifacts);
    }
    if (run.toolResult) {
      cyberCase.toolResults.push(run.toolResult);
    }
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: run.allowed ? "tool.call_completed" : "tool.call_denied",
      summary: run.toolCall.summary,
      allowed: run.allowed,
      metadata: {
        connectorId: toolRequest.connectorId,
        operation: toolRequest.operation,
        actor: toolRequest.actor,
        reason: run.reason,
        toolCallId: run.toolCall.id,
        sandboxRunId: run.sandboxRun?.id,
        sandboxArtifactIds: run.sandboxArtifacts?.map((artifact) => artifact.id) ?? []
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    if (!run.allowed) {
      return reply.code(403).send({
        error: "tool_call_denied",
        reason: run.reason,
        toolCall: run.toolCall
      });
    }

    return {
      toolCall: run.toolCall,
      toolResult: run.toolResult,
      sandboxRun: run.sandboxRun,
      sandboxArtifacts: run.sandboxArtifacts ?? [],
      case: cyberCase
    };
  });
}
