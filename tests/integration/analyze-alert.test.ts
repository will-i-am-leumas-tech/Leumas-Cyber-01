import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-alert-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("alert analysis", () => {
  it("triages suspicious encoded PowerShell alerts and stores a case", async () => {
    const fastify = await createTestApp();
    const alert = JSON.parse(await readFile("data/fixtures/alerts/powershell-encoded.json", "utf8"));

    const response = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "alert",
        json: alert
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.allowed).toBe(true);
    expect(body.result.title).toBe("Suspicious PowerShell Execution");
    expect(body.result.severity).toBe("high");
    expect(body.result.evidence.join(" ")).toContain("PowerShell");
    expect(body.case.auditEntries.map((entry: { action: string }) => entry.action)).toContain("analysis.completed");

    const casesResponse = await fastify.inject({
      method: "GET",
      url: "/cases"
    });
    expect(casesResponse.statusCode).toBe(200);
    expect(casesResponse.json().cases).toHaveLength(1);
  });
});
