import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-validation-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("authorized validation flow", () => {
  it("creates current scope, safe campaign, and telemetry result with remediation gaps", async () => {
    const fastify = await createTestApp();
    const scopeFixture = JSON.parse(await readFile("data/fixtures/validation/authorized-lab-scope.json", "utf8"));
    const campaignFixture = JSON.parse(await readFile("data/fixtures/validation/safe-detection-validation-campaign.json", "utf8"));

    const scopeResponse = await fastify.inject({
      method: "POST",
      url: "/validation/scopes",
      payload: scopeFixture
    });
    expect(scopeResponse.statusCode).toBe(200);
    const scopeId = scopeResponse.json().authorizationScope.id;

    const campaignResponse = await fastify.inject({
      method: "POST",
      url: "/validation/campaigns",
      payload: {
        ...campaignFixture,
        scopeId
      }
    });
    expect(campaignResponse.statusCode).toBe(200);
    expect(campaignResponse.json().validationObjectives[0].successCriteria.join(" ")).not.toMatch(
      /reverse shell|payload|bypass edr/i
    );
    const campaignId = campaignResponse.json().validationCampaign.id;

    const resultResponse = await fastify.inject({
      method: "POST",
      url: `/validation/campaigns/${campaignId}/results`,
      payload: {
        observedTelemetry: ["process_creation:powershell_encoded observed in endpoint.process_creation"],
        evidenceRefs: ["siem:case:123"]
      }
    });
    expect(resultResponse.statusCode).toBe(200);
    expect(resultResponse.json().validationResult.status).toBe("partial");
    expect(resultResponse.json().validationResult.remediationTasks.length).toBeGreaterThan(0);

    const getCampaignResponse = await fastify.inject({
      method: "GET",
      url: `/validation/campaigns/${campaignId}`
    });
    expect(getCampaignResponse.statusCode).toBe(200);
    expect(getCampaignResponse.json().expectations.length).toBeGreaterThan(0);
    expect(getCampaignResponse.json().results).toHaveLength(1);

    const scopesResponse = await fastify.inject({
      method: "GET",
      url: "/validation/scopes"
    });
    expect(scopesResponse.statusCode).toBe(200);
    expect(scopesResponse.json().objectiveTemplates.length).toBeGreaterThan(0);
  });

  it("blocks unsafe procedure requests inside campaign creation", async () => {
    const fastify = await createTestApp();
    const scopeFixture = JSON.parse(await readFile("data/fixtures/validation/authorized-lab-scope.json", "utf8"));
    const unsafeSteps = await readFile("data/fixtures/validation/blocked-weaponization-request.txt", "utf8");

    const scopeResponse = await fastify.inject({
      method: "POST",
      url: "/validation/scopes",
      payload: scopeFixture
    });
    const scopeId = scopeResponse.json().authorizationScope.id;

    const campaignResponse = await fastify.inject({
      method: "POST",
      url: "/validation/campaigns",
      payload: {
        scopeId,
        objective: "Unsafe campaign should be blocked.",
        objectiveTemplateIds: ["detect-encoded-powershell"],
        controlsUnderTest: ["endpoint process logging"],
        owner: "detection-engineering",
        requestedSteps: unsafeSteps
      }
    });

    expect(campaignResponse.statusCode).toBe(403);
    expect(campaignResponse.json().error).toBe("unsafe_validation_steps");
    expect(campaignResponse.json().unsafeMatches).toContain("payload_or_shell");
  });
});
