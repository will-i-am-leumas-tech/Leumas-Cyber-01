import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-docs-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("documentation flow", () => {
  it("serves the OpenAPI document for operator tooling", async () => {
    const fastify = await createTestApp();

    const response = await fastify.inject({
      method: "GET",
      url: "/docs/openapi.json"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: "3.1.0",
      info: {
        title: "Leumas Defensive Cyber Agent API"
      }
    });
    expect(Object.keys(response.json().paths)).toEqual(
      expect.arrayContaining(["/health", "/analyze", "/safety/evaluate", "/providers/health"])
    );
  });
});
