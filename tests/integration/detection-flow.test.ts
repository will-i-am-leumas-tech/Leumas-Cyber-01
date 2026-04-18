import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-detections-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("detection flow", () => {
  it("generates, validates, and tests a PowerShell detection from case evidence", async () => {
    const fastify = await createTestApp();
    const alert = JSON.parse(await readFile("data/fixtures/alerts/powershell-encoded.json", "utf8"));
    const positive = JSON.parse(await readFile("data/fixtures/detections/powershell-positive.json", "utf8"));
    const negative = JSON.parse(await readFile("data/fixtures/detections/powershell-negative-admin.json", "utf8"));

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "alert",
        json: alert
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    const caseId = analyzeResponse.json().caseId;

    const generateResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/detections`
    });
    expect(generateResponse.statusCode).toBe(200);
    const generated = generateResponse.json();
    expect(generated.detectionIntent.evidenceRefs.length).toBeGreaterThan(0);
    expect(generated.detectionRule.logic.logsource.category).toBe("process_creation");
    expect(generated.detectionRule.exportText).toContain("Suspicious Encoded PowerShell Execution");
    expect(generated.detectionRule.exportText).not.toMatch(/reverse shell|payload|bypass edr/i);

    const validateResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/detections/${generated.detectionRule.id}/validate`
    });
    expect(validateResponse.statusCode).toBe(200);
    expect(validateResponse.json().validation.passed).toBe(true);

    const testResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/detections/${generated.detectionRule.id}/test`,
      payload: {
        testCases: [positive, negative]
      }
    });
    expect(testResponse.statusCode).toBe(200);
    expect(testResponse.json().validation.passed).toBe(true);
    expect(testResponse.json().validation.testResults.map((result: { actualMatch: boolean }) => result.actualMatch)).toEqual([
      true,
      false
    ]);

    const listResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/detections`
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().detectionRules[0].validationStatus).toBe("passed");
    expect(listResponse.json().ruleValidationResults.length).toBeGreaterThanOrEqual(2);

    const caseResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`
    });
    expect(caseResponse.json().auditEntries.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining(["detection.generated", "detection.validated", "detection.tested"])
    );
  });
});
