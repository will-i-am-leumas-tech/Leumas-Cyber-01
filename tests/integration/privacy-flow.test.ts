import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";
import type { CyberModelProvider } from "../../apps/api/src/providers/base-provider";

class CapturingProvider implements CyberModelProvider {
  name = "capturing-provider";
  userPrompts: string[] = [];

  async analyze(input: {
    systemPrompt: string;
    userPrompt: string;
    context?: Record<string, unknown>;
  }): Promise<{ text: string; structured?: Record<string, unknown> }> {
    this.userPrompts.push(input.userPrompt);
    return {
      text: "Captured defensive privacy-safe prompt.",
      structured: {
        provider: this.name,
        promptLength: input.userPrompt.length
      }
    };
  }
}

let app: FastifyInstance | undefined;

async function createTestApp(provider: CyberModelProvider): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-privacy-"));
  app = await createApp({ dataDir, provider });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("privacy flow", () => {
  it("scans standalone text and returns redacted artifacts", async () => {
    const provider = new CapturingProvider();
    const fastify = await createTestApp(provider);
    const text = await readFile("data/fixtures/privacy/secrets-in-log.log", "utf8");

    const response = await fastify.inject({
      method: "POST",
      url: "/privacy/scan",
      payload: {
        sourceRef: "fixture:privacy",
        text
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().findings).toHaveLength(6);
    expect(response.json().dataClassification.dataClass).toBe("restricted");
    expect(response.json().redactedArtifact.redactedText).toContain("[REDACTED_API_KEY_006]");
    expect(response.json().redactedArtifact.redactedText).not.toContain("sk_live_1234567890abcdef1234567890abcdef");
  });

  it("redacts sensitive input before provider calls and records privacy metadata on the case", async () => {
    const provider = new CapturingProvider();
    const fastify = await createTestApp(provider);
    const text = await readFile("data/fixtures/privacy/secrets-in-log.log", "utf8");

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        title: "Privacy log case",
        text
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    const body = analyzeResponse.json();

    expect(provider.userPrompts).toHaveLength(1);
    expect(provider.userPrompts[0]).toContain("[REDACTED_TOKEN_002]");
    expect(provider.userPrompts[0]).not.toContain("CorrectHorseBatteryStaple");
    expect(provider.userPrompts[0]).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(body.case.sensitiveFindings).toHaveLength(6);
    expect(body.case.redactedArtifacts[0].redactedText).not.toContain("sk_live_1234567890abcdef1234567890abcdef");
    expect(body.case.promptPackages[0].mode).toBe("redact");
    expect(body.case.dataClassifications[0].dataClass).toBe("restricted");
    expect(body.case.auditEntries.map((entry: { action: string }) => entry.action)).toContain("privacy.sensitive_data_detected");
    expect(JSON.stringify(body.case.auditEntries)).not.toContain("CorrectHorseBatteryStaple");

    const privacyResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${body.caseId}/privacy`
    });
    expect(privacyResponse.statusCode).toBe(200);
    expect(privacyResponse.json().promptPackages).toHaveLength(1);

    const redactResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${body.caseId}/redact`
    });
    expect(redactResponse.statusCode).toBe(200);
    expect(redactResponse.json().case.privacyAuditEvents.length).toBeGreaterThanOrEqual(2);
  });
});
