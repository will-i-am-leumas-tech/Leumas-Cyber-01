import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-tools-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("tool flow", () => {
  it("lists connectors, runs mock SIEM query, stores result, and audits the tool call", async () => {
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

    const connectorsResponse = await fastify.inject({
      method: "GET",
      url: "/tools/connectors"
    });
    expect(connectorsResponse.statusCode).toBe(200);
    expect(connectorsResponse.json().connectors[0].id).toBe("mock-siem");

    const healthResponse = await fastify.inject({
      method: "POST",
      url: "/tools/mock-siem/health"
    });
    expect(healthResponse.statusCode).toBe(200);
    expect(healthResponse.json().ok).toBe(true);

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
    expect(toolResponse.json().toolResult.records).toHaveLength(2);
    expect(toolResponse.json().case.auditEntries.map((entry: { action: string }) => entry.action)).toContain(
      "tool.call_completed"
    );

    const storedResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/tool-calls`
    });
    expect(storedResponse.statusCode).toBe(200);
    expect(storedResponse.json().toolCalls).toHaveLength(1);
    expect(storedResponse.json().toolResults[0].recordRefs).toContain("siem_evt_001");
  });

  it("denies unsafe or unknown operations with structured policy errors", async () => {
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

    const deniedResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/tool-calls`,
      payload: {
        connectorId: "mock-siem",
        operation: "delete_events",
        actor: "analyst@example.test",
        parameters: {
          query: "admin"
        }
      }
    });

    expect(deniedResponse.statusCode).toBe(403);
    expect(deniedResponse.json().reason).toBe("operation_not_allowed");

    const storedResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/tool-calls`
    });
    expect(storedResponse.json().toolCalls[0].status).toBe("denied");
    expect(storedResponse.json().toolResults).toHaveLength(0);
  });
});
