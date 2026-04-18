import { readFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-tool-sandbox-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("tool sandbox flow", () => {
  it("lists manifests, records sandbox runs, captures artifacts, and gates approvals", async () => {
    const fastify = await createTestApp();
    const allowedFixture = JSON.parse(await readFile("data/fixtures/sandbox/allowed-readonly-tool.json", "utf8"));
    const blockedFixture = JSON.parse(await readFile("data/fixtures/sandbox/blocked-egress-tool.json", "utf8"));
    const approvalFixture = JSON.parse(await readFile("data/fixtures/sandbox/approval-required-tool.json", "utf8"));

    const manifests = await fastify.inject({
      method: "GET",
      url: "/sandbox/manifests"
    });
    expect(manifests.statusCode).toBe(200);
    expect(manifests.json().manifests.map((manifest: { id: string }) => manifest.id)).toEqual(
      expect.arrayContaining(["mock-siem.search_events", "manual.add_watchlist_entry"])
    );

    const allowedRun = await fastify.inject({
      method: "POST",
      url: "/sandbox/runs",
      payload: allowedFixture
    });
    expect(allowedRun.statusCode).toBe(200);
    expect(allowedRun.json().run.status).toBe("completed");
    expect(allowedRun.json().artifacts.length).toBeGreaterThan(0);

    const artifacts = await fastify.inject({
      method: "GET",
      url: `/sandbox/runs/${allowedRun.json().run.id}/artifacts`
    });
    expect(artifacts.statusCode).toBe(200);
    expect(artifacts.json().artifacts[0].hash).toMatch(/^[a-f0-9]{64}$/);

    const blockedRun = await fastify.inject({
      method: "POST",
      url: "/sandbox/runs",
      payload: blockedFixture
    });
    expect(blockedRun.statusCode).toBe(200);
    expect(blockedRun.json().run.status).toBe("denied");
    expect(blockedRun.json().run.egressDecision.allowed).toBe(false);

    const approvalRun = await fastify.inject({
      method: "POST",
      url: "/sandbox/runs",
      payload: approvalFixture
    });
    expect(approvalRun.statusCode).toBe(200);
    expect(approvalRun.json().run.status).toBe("approval_required");

    const approval = await fastify.inject({
      method: "POST",
      url: `/sandbox/runs/${approvalRun.json().run.id}/approve`,
      payload: {
        approver: "lead@example.test",
        reason: "Approved for defensive watchlist update after analyst review.",
        approved: true
      }
    });
    expect(approval.statusCode).toBe(200);
    expect(approval.json().sandboxRun.status).toBe("planned");
    expect(approval.json().audit.action).toBe("sandbox.run_approval_recorded");
  });

  it("routes normal tool calls through the sandbox and stores run artifacts on the case", async () => {
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
    const toolResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/tool-calls`,
      payload: {
        connectorId: "mock-siem",
        operation: "search_events",
        actor: "analyst@example.test",
        parameters: {
          query: "203.0.113.10",
          limit: 2
        }
      }
    });

    expect(toolResponse.statusCode).toBe(200);
    expect(toolResponse.json().sandboxRun.status).toBe("completed");
    expect(toolResponse.json().toolCall.sandboxRunId).toBe(toolResponse.json().sandboxRun.id);
    expect(toolResponse.json().case.sandboxRuns).toHaveLength(1);
    expect(toolResponse.json().case.sandboxArtifacts.length).toBeGreaterThan(0);
    expect(toolResponse.json().toolResult.sandboxArtifactIds.length).toBeGreaterThan(0);
  });
});
