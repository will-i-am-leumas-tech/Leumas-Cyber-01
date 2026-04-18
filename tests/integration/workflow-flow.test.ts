import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-workflow-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("workflow flow", () => {
  it("creates default workflow, updates state, manages tasks, and records decisions", async () => {
    const fastify = await createTestApp();
    const createResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: [
          "2026-04-16T09:00:00Z failed login user=admin src=203.0.113.10",
          "2026-04-16T09:00:15Z failed login user=admin src=203.0.113.10",
          "2026-04-16T09:00:31Z successful login user=admin src=203.0.113.10"
        ].join("\n")
      }
    });
    const created = createResponse.json();
    expect(created.case.state).toBe("new");
    expect(created.case.tasks.length).toBeGreaterThan(0);

    const stateResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${created.caseId}/state`,
      payload: {
        state: "triaging",
        actor: "analyst@example.test",
        reason: "Initial analyst review started."
      }
    });
    expect(stateResponse.statusCode).toBe(200);
    expect(stateResponse.json().case.state).toBe("triaging");

    const taskResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${created.caseId}/tasks`,
      payload: {
        title: "Check VPN logs",
        owner: "analyst@example.test",
        priority: "medium",
        required: false
      }
    });
    expect(taskResponse.statusCode).toBe(200);
    const taskId = taskResponse.json().task.id;

    const patchTaskResponse = await fastify.inject({
      method: "PATCH",
      url: `/cases/${created.caseId}/tasks/${taskId}`,
      payload: {
        status: "done"
      }
    });
    expect(patchTaskResponse.statusCode).toBe(200);
    expect(patchTaskResponse.json().task.status).toBe("done");

    const decisionResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${created.caseId}/decisions`,
      payload: {
        decisionType: "note",
        decision: "Continue investigation",
        rationale: "Account activity needs more context.",
        approver: "lead@example.test",
        evidenceRefs: ["finding_001"]
      }
    });
    expect(decisionResponse.statusCode).toBe(200);

    const workflowResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${created.caseId}/workflow`
    });
    expect(workflowResponse.statusCode).toBe(200);
    expect(workflowResponse.json().workflowTransitions.length).toBeGreaterThanOrEqual(2);
    expect(workflowResponse.json().decisions).toHaveLength(1);
  });

  it("blocks closing cases with open required tasks until override is recorded", async () => {
    const fastify = await createTestApp();
    const createResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: "2026-04-16T09:00:00Z failed login user=admin src=203.0.113.10"
      }
    });
    const caseId = createResponse.json().caseId;

    await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/state`,
      payload: {
        state: "triaging",
        reason: "Start triage."
      }
    });

    const blockedClose = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/state`,
      payload: {
        state: "closed",
        reason: "Attempt close."
      }
    });
    expect(blockedClose.statusCode).toBe(409);

    await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/decisions`,
      payload: {
        decisionType: "closure_override",
        decision: "Close duplicate case",
        rationale: "Covered by parent incident.",
        approver: "lead@example.test"
      }
    });

    const allowedClose = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/state`,
      payload: {
        state: "closed",
        reason: "Closure override approved."
      }
    });
    expect(allowedClose.statusCode).toBe(200);
    expect(allowedClose.json().case.state).toBe("closed");
    expect(allowedClose.json().case.auditEntries.map((entry: { action: string }) => entry.action)).toContain(
      "workflow.state_updated"
    );
  });
});
