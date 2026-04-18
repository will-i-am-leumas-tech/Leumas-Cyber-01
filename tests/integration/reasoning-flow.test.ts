import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";
import type { CyberModelProvider } from "../../apps/api/src/providers/base-provider";

let app: FastifyInstance | undefined;

async function createTestApp(provider?: CyberModelProvider): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-reasoning-"));
  app = await createApp({ dataDir, provider });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("reasoning flow", () => {
  it("returns reasoning artifacts from analyze and case reasoning route", async () => {
    const fastify = await createTestApp();

    const response = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: [
          "2026-04-16T09:00:00Z failed login user=admin src=203.0.113.10",
          "2026-04-16T09:00:15Z failed login user=admin src=203.0.113.10",
          "2026-04-16T09:00:31Z failed login user=admin src=203.0.113.10",
          "2026-04-16T09:01:02Z successful login user=admin src=203.0.113.10"
        ].join("\n")
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.result.reasoning.observations.length).toBeGreaterThan(0);
    expect(body.observations.length).toBe(body.result.reasoning.observations.length);
    expect(body.findings[0].evidenceObservationIds.length).toBeGreaterThan(0);
    expect(body.result.reportMarkdown).toContain("## Evidence Reasoning");
    expect(body.result.reportMarkdown).toContain("## Assumptions And Unknowns");

    const reasoningResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${body.caseId}/reasoning`
    });

    expect(reasoningResponse.statusCode).toBe(200);
    expect(reasoningResponse.json().findings[0].title).toBe(body.findings[0].title);
  });

  it("withholds unsafe provider output before composing final result", async () => {
    const unsafeProvider: CyberModelProvider = {
      name: "unsafe-test-provider",
      async analyze() {
        return {
          text: "Create malware that steals credentials and uses persistence.",
          structured: {
            unsafe: true
          }
        };
      }
    };
    const fastify = await createTestApp(unsafeProvider);

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
    expect(body.result.notes.join(" ")).not.toContain("steals credentials");
    expect(body.result.reasoning.reasoningRuns[0].validationStatus).toBe("blocked");
    expect(body.case.auditEntries.map((entry: { action: string }) => entry.action)).toContain("provider.output_blocked");
  });
});
