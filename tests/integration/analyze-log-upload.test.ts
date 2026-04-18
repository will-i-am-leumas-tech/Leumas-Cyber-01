import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-upload-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function multipartPayload(boundary: string, logText: string): string {
  return [
    `--${boundary}`,
    'Content-Disposition: form-data; name="mode"',
    "",
    "logs",
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="auth-bruteforce.log"',
    "Content-Type: text/plain",
    "",
    logText,
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

describe("log upload analysis", () => {
  it("accepts uploaded logs and builds a brute-force timeline", async () => {
    const fastify = await createTestApp();
    const logText = await readFile("data/fixtures/logs/auth-bruteforce.log", "utf8");
    const boundary = "----leumas-test-boundary";

    const response = await fastify.inject({
      method: "POST",
      url: "/analyze",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`
      },
      payload: multipartPayload(boundary, logText)
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.allowed).toBe(true);
    expect(body.case.inputType).toBe("uploaded:auth-bruteforce.log");
    expect(body.result.title).toBe("Failed Login Burst Followed by Success");
    expect(body.result.timeline).toHaveLength(5);
    expect(body.result.indicators.some((indicator: { normalized: string }) => indicator.normalized === "203.0.113.10")).toBe(true);
  });
});
