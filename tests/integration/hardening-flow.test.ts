import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-hardening-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("hardening flow", () => {
  it("returns defensive IIS hardening guidance", async () => {
    const fastify = await createTestApp();

    const response = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "hardening",
        text: "How do I harden IIS on a Windows Server?"
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.allowed).toBe(true);
    expect(body.result.title).toBe("IIS Hardening Checklist");
    expect(body.result.recommendedActions.join(" ")).toContain("TLS");
    expect(body.result.notes.join(" ")).toContain("defensive");
  });
});
