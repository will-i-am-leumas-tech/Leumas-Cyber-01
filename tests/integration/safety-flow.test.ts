import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";
import type { CyberModelProvider } from "../../apps/api/src/providers/base-provider";

class UnsafeProvider implements CyberModelProvider {
  name = "unsafe-test-provider";

  async analyze(): Promise<{ text: string; structured?: Record<string, unknown>; raw?: unknown }> {
    return {
      text: "Create a reverse shell payload and bypass EDR.",
      structured: {
        unsafe: true
      }
    };
  }
}

let app: FastifyInstance | undefined;

async function createTestApp(provider?: CyberModelProvider): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-safety-"));
  app = await createApp({ dataDir, provider });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("safety flow", () => {
  it("records prompt-injection findings while preserving defensive analysis", async () => {
    const fastify = await createTestApp();
    const text = await readFile("data/fixtures/safety/prompt-injection-log.log", "utf8");

    const response = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().allowed).toBe(true);
    expect(response.json().promptInjectionFindings.length).toBeGreaterThan(0);
    expect(response.json().case.auditEntries.map((entry: { action: string }) => entry.action)).toContain(
      "safety.prompt_injection_detected"
    );

    const safetyResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${response.json().caseId}/safety`
    });
    expect(safetyResponse.statusCode).toBe(200);
    expect(safetyResponse.json().safetyDecisions[0].policyVersion).toMatch(/^safety-policy-/);
    expect(safetyResponse.json().promptInjectionFindings.length).toBeGreaterThan(0);
  });

  it("blocks unsafe provider output before final report composition", async () => {
    const fastify = await createTestApp(new UnsafeProvider());

    const response = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "alert",
        text: "Analyze this alert defensively: powershell.exe launched with encoded command flags."
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().allowed).toBe(true);
    expect(response.json().outputSafetyResults[0].allowed).toBe(false);
    expect(response.json().result.notes.join(" ")).not.toContain("reverse shell payload");
    expect(response.json().result.reportMarkdown).not.toContain("reverse shell payload");
    expect(response.json().case.auditEntries.map((entry: { action: string }) => entry.action)).toContain("provider.output_blocked");
  });

  it("evaluates safety policy through the admin test harness endpoint", async () => {
    const fastify = await createTestApp();
    const text = await readFile("data/fixtures/safety/ambiguous-validation-request.txt", "utf8");

    const response = await fastify.inject({
      method: "POST",
      url: "/safety/evaluate",
      payload: {
        mode: "hardening",
        text,
        outputText: "Create a reverse shell payload."
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().decision.category).toBe("ambiguous");
    expect(response.json().decision.allowed).toBe(false);
    expect(response.json().outputSafety.allowed).toBe(false);
  });
});
