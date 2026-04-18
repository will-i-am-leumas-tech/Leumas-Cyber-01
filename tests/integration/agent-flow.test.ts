import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-agents-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("agent orchestration flow", () => {
  it("runs deterministic bounded agents and persists tasks, results, arbitration, and audit", async () => {
    const fastify = await createTestApp();
    const logText = await readFile("data/fixtures/logs/windows-process.log", "utf8");

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        title: "Agent flow log case",
        text: logText
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    const caseId = analyzeResponse.json().caseId;

    const orchestrationResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/orchestrations`,
      payload: {
        plan: "standard-log-plan"
      }
    });
    expect(orchestrationResponse.statusCode).toBe(200);
    const orchestration = orchestrationResponse.json();

    expect(orchestration.orchestrationRun.finalStatus).toBe("completed");
    expect(orchestration.orchestrationRun.taskIds).toHaveLength(6);
    expect(orchestration.agentTasks.map((task: { role: string }) => task.role)).toEqual([
      "parser",
      "investigator",
      "retriever",
      "reporter",
      "safetyReviewer",
      "toolExecutor"
    ]);
    expect(orchestration.agentResults.every((result: { validationStatus: string }) => result.validationStatus === "passed")).toBe(true);
    expect(orchestration.arbitrationResult.validationStatus).toBe("passed");
    expect(orchestration.arbitrationResult.selectedFindingIds.length).toBeGreaterThan(0);
    expect(orchestration.case.agentTasks).toHaveLength(6);
    expect(orchestration.case.auditEntries.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining(["agents.orchestration_completed"])
    );

    const detailResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/orchestrations/${orchestration.orchestrationRun.id}`
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().agentTasks).toHaveLength(6);
    expect(detailResponse.json().agentResults).toHaveLength(6);

    const tasksResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/agent-tasks`
    });
    expect(tasksResponse.statusCode).toBe(200);
    expect(tasksResponse.json().agentRoles).toHaveLength(6);
    expect(tasksResponse.json().orchestrationRuns[0].finalStatus).toBe("completed");
  });
});
