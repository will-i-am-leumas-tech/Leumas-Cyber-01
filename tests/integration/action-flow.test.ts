import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-actions-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function createCase(fastify: FastifyInstance): Promise<string> {
  const createResponse = await fastify.inject({
    method: "POST",
    url: "/analyze",
    payload: {
      mode: "logs",
      text: "2026-04-16T09:00:00Z failed login user=admin src=203.0.113.10"
    }
  });
  return createResponse.json().caseId as string;
}

describe("action flow", () => {
  it("creates, dry-runs, and executes low-risk no-op action plans", async () => {
    const fastify = await createTestApp();
    const caseId = await createCase(fastify);
    const actionPlan = JSON.parse(await readFile("data/fixtures/actions/manual-containment-plan.json", "utf8"));

    const createPlanResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/action-plans`,
      payload: actionPlan
    });
    expect(createPlanResponse.statusCode).toBe(200);
    const planId = createPlanResponse.json().actionPlan.id;

    const dryRunResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/action-plans/${planId}/dry-run`
    });
    expect(dryRunResponse.statusCode).toBe(200);
    expect(dryRunResponse.json().actionPlan.steps[0].dryRunResult).toContain("Dry run only");

    const executeResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/action-plans/${planId}/execute`
    });
    expect(executeResponse.statusCode).toBe(200);
    expect(executeResponse.json().actionExecutions[0].result).toContain("No external state was changed");
    expect(executeResponse.json().case.auditEntries.map((entry: { action: string }) => entry.action)).toContain(
      "action.execution_completed"
    );
  });

  it("requires approval before high-risk no-op action execution", async () => {
    const fastify = await createTestApp();
    const caseId = await createCase(fastify);
    const actionPlan = JSON.parse(await readFile("data/fixtures/actions/mock-approved-action.json", "utf8"));

    const createPlanResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/action-plans`,
      payload: actionPlan
    });
    const planId = createPlanResponse.json().actionPlan.id;

    const blockedExecute = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/action-plans/${planId}/execute`
    });
    expect(blockedExecute.statusCode).toBe(409);

    const approvalResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/action-plans/${planId}/approval`,
      payload: {
        status: "approved",
        approverRole: "lead",
        requestedBy: "analyst@example.test",
        decidedBy: "lead@example.test",
        reason: "Approved for mock no-op validation."
      }
    });
    expect(approvalResponse.statusCode).toBe(200);

    const executeResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/action-plans/${planId}/execute`
    });
    expect(executeResponse.statusCode).toBe(200);
    expect(executeResponse.json().actionExecutions[0].status).toBe("success");
  });

  it("blocks unsupported high-risk operations", async () => {
    const fastify = await createTestApp();
    const caseId = await createCase(fastify);
    const actionPlan = JSON.parse(await readFile("data/fixtures/actions/blocked-high-risk-action.json", "utf8"));

    const createPlanResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/action-plans`,
      payload: actionPlan
    });

    expect(createPlanResponse.statusCode).toBe(403);
    expect(createPlanResponse.json().reason).toBe("operation_requires_future_safe_action_connector");
  });
});
