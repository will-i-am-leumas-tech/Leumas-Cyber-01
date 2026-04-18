import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-validation-lab-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("authorized validation lab flow", () => {
  it("creates signed scope, blocks denied targets, runs benign replay, and builds an evidence report", async () => {
    const fastify = await createTestApp();
    const scopeFixture = JSON.parse(await readFile("data/fixtures/validation/approved-lab-scope-v2.json", "utf8"));

    const templatesResponse = await fastify.inject({
      method: "GET",
      url: "/validation/v2/templates"
    });
    expect(templatesResponse.statusCode).toBe(200);
    expect(templatesResponse.json().templates.map((template: { id: string }) => template.id)).toContain("safe-control-validation");

    const scopeResponse = await fastify.inject({
      method: "POST",
      url: "/validation/v2/scopes",
      payload: scopeFixture
    });
    expect(scopeResponse.statusCode).toBe(200);
    const scope = scopeResponse.json().authorizationScope;
    expect(scope.signature).toMatch(/^[a-f0-9]{64}$/);

    const deniedCampaign = await fastify.inject({
      method: "POST",
      url: "/validation/v2/campaigns",
      payload: {
        scopeId: scope.id,
        templateIds: ["safe-control-validation"],
        actor: "analyst@example.test",
        target: "prod-db-01.example.test",
        requestedObjective: "Validate controls with benign replay."
      }
    });
    expect(deniedCampaign.statusCode).toBe(403);
    expect(deniedCampaign.json().error).toBe("target_denied");

    const unsafeCampaign = await fastify.inject({
      method: "POST",
      url: "/validation/v2/campaigns",
      payload: {
        scopeId: scope.id,
        templateIds: ["safe-control-validation"],
        actor: "analyst@example.test",
        target: "lab-host-01.example.test",
        requestedObjective: "Use a reverse shell payload to test bypass edr behavior."
      }
    });
    expect(unsafeCampaign.statusCode).toBe(403);
    expect(unsafeCampaign.json().error).toBe("unsafe_validation_objective");

    const campaignResponse = await fastify.inject({
      method: "POST",
      url: "/validation/v2/campaigns",
      payload: {
        scopeId: scope.id,
        templateIds: ["safe-control-validation"],
        actor: "analyst@example.test",
        target: "lab-host-01.example.test",
        requestedObjective: "Validate encoded PowerShell detection routing with benign replay."
      }
    });
    expect(campaignResponse.statusCode).toBe(200);
    const campaignId = campaignResponse.json().validationCampaign.id;
    expect(campaignResponse.json().validationCampaign.safetyDecisions).toContain("lab_mode_enforced");

    const replayResponse = await fastify.inject({
      method: "POST",
      url: `/validation/v2/campaigns/${campaignId}/replay`
    });
    expect(replayResponse.statusCode).toBe(200);
    expect(replayResponse.json().replayedTelemetry.length).toBeGreaterThan(0);
    expect(JSON.stringify(replayResponse.json())).not.toMatch(/reverse shell|payload|bypass edr/i);

    const reportResponse = await fastify.inject({
      method: "GET",
      url: `/validation/v2/campaigns/${campaignId}/evidence-report`
    });
    expect(reportResponse.statusCode).toBe(200);
    expect(reportResponse.json().evidenceReport.citations.length).toBe(replayResponse.json().replayedTelemetry.length);
    expect(reportResponse.json().evidenceReport.remediation.join(" ")).not.toMatch(/exploit|payload|stealth/i);

    const getCampaign = await fastify.inject({
      method: "GET",
      url: `/validation/v2/campaigns/${campaignId}`
    });
    expect(getCampaign.statusCode).toBe(200);
    expect(getCampaign.json().reports).toHaveLength(1);
  });
});
