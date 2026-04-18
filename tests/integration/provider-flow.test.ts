import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-providers-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("provider maturity flow", () => {
  it("exposes provider registry, records usage, and validates structured outputs", async () => {
    const fastify = await createTestApp();

    const providers = await fastify.inject({
      method: "GET",
      url: "/providers"
    });
    expect(providers.statusCode).toBe(200);
    expect(providers.json().activeProvider).toBe("local-mock");
    expect(providers.json().selectedForAlert.id).toBe("local-mock");

    const analyze = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "alert",
        text: "2026-04-16T10:15:00Z host=WS-42 image=powershell.exe command_line=\"powershell.exe -EncodedCommand SQBFAFgA\"",
        useKnowledge: false
      }
    });
    expect(analyze.statusCode).toBe(200);
    const body = analyze.json();
    expect(body.case.providerCalls).toHaveLength(1);
    expect(body.case.providerCalls[0]).toMatchObject({
      provider: "local-mock",
      model: "local-mock-deterministic",
      status: "completed",
      taskType: "alert"
    });
    expect(body.case.structuredOutputValidations[0].status).toBe("passed");
    expect(body.case.usageRecords[0].totalTokens).toBeGreaterThan(0);

    const usage = await fastify.inject({
      method: "GET",
      url: "/providers/usage"
    });
    expect(usage.statusCode).toBe(200);
    expect(usage.json().summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "local-mock",
          calls: 1,
          failures: 0
        })
      ])
    );

    const health = await fastify.inject({
      method: "GET",
      url: "/providers/health"
    });
    expect(health.statusCode).toBe(200);
    expect(health.json().providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "local-mock",
          status: "healthy"
        })
      ])
    );

    const readiness = await fastify.inject({
      method: "POST",
      url: "/providers/test",
      payload: {
        taskType: "eval"
      }
    });
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json().selectedProvider.id).toBe("local-mock");
    expect(readiness.json().structuredOutputValidation.status).toBe("passed");
  });
});
