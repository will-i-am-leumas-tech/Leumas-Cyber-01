import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SandboxRunStore } from "../sandbox/sandbox-runner";
import { sandboxAuditMetadata, sandboxAuditSummary } from "../sandbox/sandbox-audit-service";
import { approveSandboxRunSchema, createSandboxRunSchema } from "../schemas/sandbox.schema";
import type { AuditService } from "../services/audit-service";

interface SandboxRouteDeps {
  auditService: AuditService;
  sandboxRunStore: SandboxRunStore;
}

const sandboxRunParamsSchema = z.object({
  id: z.string().min(1)
});

export function registerSandboxRoutes(app: FastifyInstance, deps: SandboxRouteDeps): void {
  app.get("/sandbox/manifests", async () => ({
    manifests: await deps.sandboxRunStore.listManifests()
  }));

  app.post("/sandbox/runs", async (request) => {
    const input = createSandboxRunSchema.parse(request.body);
    const result = await deps.sandboxRunStore.createRun(input);
    const audit = await deps.auditService.record({
      caseId: input.caseId,
      action: result.run.status === "completed" ? "sandbox.run_completed" : "sandbox.run_blocked",
      summary: sandboxAuditSummary(result.run),
      allowed: result.run.status === "completed",
      metadata: sandboxAuditMetadata(result.run, result.artifacts)
    });

    return {
      ...result,
      audit
    };
  });

  app.get("/sandbox/runs/:id", async (request, reply) => {
    const params = sandboxRunParamsSchema.parse(request.params);
    const run = await deps.sandboxRunStore.getRun(params.id);
    if (!run) {
      return reply.code(404).send({ error: "sandbox_run_not_found" });
    }

    return { sandboxRun: run };
  });

  app.get("/sandbox/runs/:id/artifacts", async (request, reply) => {
    const params = sandboxRunParamsSchema.parse(request.params);
    const run = await deps.sandboxRunStore.getRun(params.id);
    if (!run) {
      return reply.code(404).send({ error: "sandbox_run_not_found" });
    }

    return {
      sandboxRun: run,
      artifacts: await deps.sandboxRunStore.getArtifacts(params.id)
    };
  });

  app.post("/sandbox/runs/:id/approve", async (request, reply) => {
    const params = sandboxRunParamsSchema.parse(request.params);
    const input = approveSandboxRunSchema.parse(request.body);
    const run = await deps.sandboxRunStore.approveRun(params.id, input.approved, input.approver);
    if (!run) {
      return reply.code(404).send({ error: "sandbox_run_not_found" });
    }

    const artifacts = await deps.sandboxRunStore.getArtifacts(params.id);
    const audit = await deps.auditService.record({
      caseId: run.caseId,
      action: "sandbox.run_approval_recorded",
      summary: input.approved ? `Sandbox run approved: ${input.reason}.` : `Sandbox run rejected: ${input.reason}.`,
      allowed: input.approved,
      metadata: sandboxAuditMetadata(run, artifacts)
    });

    return {
      sandboxRun: run,
      audit
    };
  });
}
