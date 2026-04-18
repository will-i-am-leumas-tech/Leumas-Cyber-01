import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-detection-lifecycle-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("detection lifecycle flow", () => {
  it("generates v2 variants, validates KQL, corpus-tests fixtures, simulates false positives, records deployment, and reports coverage", async () => {
    const fastify = await createTestApp();
    const alert = JSON.parse(await readFile("data/fixtures/alerts/powershell-encoded.json", "utf8"));

    const formats = await fastify.inject({
      method: "GET",
      url: "/detections/formats"
    });
    expect(formats.statusCode).toBe(200);
    expect(formats.json().formats.map((format: { id: string }) => format.id)).toEqual(expect.arrayContaining(["kql", "spl", "yara"]));

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
    const kqlRule = generated.detectionRulesV2.find((rule: { format: string }) => rule.format === "kql");
    expect(kqlRule.content).toContain("| where");
    expect(generated.detectionRulesV2.find((rule: { format: string }) => rule.format === "yara").content).toContain(
      "defensive detection"
    );

    const validateResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/detections/${generated.detectionRule.id}/v2/validate`,
      payload: {
        format: "kql"
      }
    });
    expect(validateResponse.statusCode).toBe(200);
    expect(validateResponse.json().validation.passed).toBe(true);
    expect(validateResponse.json().detectionRuleV2.status).toBe("validated");

    const corpusResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/detections/${generated.detectionRule.id}/test-corpus`,
      payload: {
        corpusItems: [
          {
            label: "positive",
            source: "positive fixture",
            expectedMatch: true,
            eventData: {
              process: {
                image: "powershell.exe",
                command_line: "-EncodedCommand SQBFAFgA"
              }
            },
            tags: ["encoded PowerShell"]
          },
          {
            label: "benign",
            source: "benign admin fixture",
            expectedMatch: false,
            eventData: {
              process: {
                image: "powershell.exe",
                command_line: "Get-Service WinRM"
              }
            },
            tags: ["admin automation"]
          }
        ]
      }
    });
    expect(corpusResponse.statusCode).toBe(200);
    expect(corpusResponse.json().corpusRun.passed).toBe(true);

    const falsePositiveResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/detections/${generated.detectionRule.id}/simulate-false-positives`,
      payload: {
        corpusItems: [
          {
            label: "benign",
            source: "benign admin fixture",
            expectedMatch: false,
            eventData: {
              process: {
                image: "powershell.exe",
                command_line: "Get-Service WinRM"
              }
            },
            tags: ["admin automation"]
          }
        ]
      }
    });
    expect(falsePositiveResponse.statusCode).toBe(200);
    expect(falsePositiveResponse.json().simulation.riskScore).toBe(0);

    const deploymentResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/detections/${kqlRule.id}/deployments`,
      payload: {
        backend: "microsoft-sentinel",
        version: "1.0.0",
        status: "planned",
        owner: "detection-engineering"
      }
    });
    expect(deploymentResponse.statusCode).toBe(200);
    expect(deploymentResponse.json().deployment.backend).toBe("microsoft-sentinel");

    const coverageResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/detections/coverage`
    });
    expect(coverageResponse.statusCode).toBe(200);
    expect(coverageResponse.json().coverage.formats.kql).toBe(1);
    expect(coverageResponse.json().coverage.deploymentStatuses.planned).toBe(1);

    const caseResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`
    });
    expect(caseResponse.json().auditEntries.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining([
        "detection.v2_validated",
        "detection.corpus_tested",
        "detection.false_positives_simulated",
        "detection.deployment_recorded"
      ])
    );
  });
});
