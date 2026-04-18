import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-agents-v2-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("multi-agent reliability flow", () => {
  it("runs v2 investigation, exposes traces, arbitrates, and records overrides", async () => {
    const fastify = await createTestApp();
    const logText = await readFile("data/fixtures/logs/windows-process.log", "utf8");
    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        title: "Agent v2 flow log case",
        text: logText
      }
    });
    const caseId = analyzeResponse.json().caseId;

    const roles = await fastify.inject({
      method: "GET",
      url: "/agents/roles"
    });
    expect(roles.statusCode).toBe(200);
    expect(roles.json().roleContracts.map((contract: { id: string }) => contract.id)).toContain("investigator");

    const investigation = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/agents/investigate`,
      payload: {
        plan: "standard-log-plan"
      }
    });
    expect(investigation.statusCode).toBe(200);
    expect(investigation.json().orchestrationRun.finalStatus).toBe("completed");
    expect(investigation.json().agentTraces).toHaveLength(6);
    expect(investigation.json().reviewerFinding.status).toBe("passed");
    expect(investigation.json().arbitrationResult.reviewerStatus).toBe("passed");
    expect(investigation.json().case.agentMemoryItems.length).toBeGreaterThan(0);

    const traces = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/agents/traces`
    });
    expect(traces.statusCode).toBe(200);
    expect(traces.json().agentTraces[0].policyDecisions).toEqual(expect.arrayContaining(["within_budget"]));

    const arbitration = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/agents/arbitrate`
    });
    expect(arbitration.statusCode).toBe(200);
    expect(arbitration.json().arbitrationResult.evidenceIds.length).toBeGreaterThan(0);

    const override = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/agents/overrides`,
      payload: {
        actor: "lead@example.test",
        decision: "approve",
        reason: "Trace and reviewer output are evidence-backed.",
        affectedFindingIds: investigation.json().arbitrationResult.evidenceIds
      }
    });
    expect(override.statusCode).toBe(200);
    expect(override.json().operatorOverride.decision).toBe("approve");
    expect(override.json().case.auditEntries.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining(["agents.v2_investigation_completed", "agents.operator_override_recorded"])
    );
  });
});
