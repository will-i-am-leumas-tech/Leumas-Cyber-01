import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-model-quality-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("model provider quality flow", () => {
  it("exposes model profiles, prompt versions, fallback decisions, and grounding findings", async () => {
    const fastify = await createTestApp();

    const profiles = await fastify.inject({
      method: "GET",
      url: "/providers/profiles"
    });
    expect(profiles.statusCode).toBe(200);
    expect(profiles.json().profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerId: "local-mock",
          supportsStructuredOutput: true
        })
      ])
    );
    expect(profiles.json().promptVersions[0]).toMatchObject({
      taskType: "defensive-analysis",
      schemaName: "defensive-analysis-provider"
    });

    const providers = await fastify.inject({
      method: "GET",
      url: "/providers"
    });
    expect(providers.statusCode).toBe(200);
    expect(providers.json().fallbackForAlert).toMatchObject({
      action: "use_selected",
      selectedProviderId: "local-mock"
    });

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
    expect(analyze.json().case.groundingFindings.length).toBeGreaterThan(0);
    expect(analyze.json().case.auditEntries.map((entry: { action: string }) => entry.action)).toContain(
      "model.grounding_validated"
    );
  });
});
