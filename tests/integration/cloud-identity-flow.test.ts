import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-cloud-identity-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("cloud and identity flow", () => {
  it("imports cloud and identity events, records posture findings, and links context to a case", async () => {
    const fastify = await createTestApp();
    const cloudTrail = JSON.parse(await readFile("data/fixtures/cloud/cloudtrail-admin-change.json", "utf8"));
    const publicStorage = JSON.parse(await readFile("data/fixtures/cloud/public-storage-finding.json", "utf8"));
    const riskySignins = JSON.parse(await readFile("data/fixtures/identity/entra-risky-signins.json", "utf8"));
    const oktaMfaDisabled = JSON.parse(await readFile("data/fixtures/identity/okta-mfa-disabled.json", "utf8"));

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: "2026-04-16T12:00:00Z identity alert opened for cloud admin review"
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    const caseId = analyzeResponse.json().caseId;

    const cloudImportResponse = await fastify.inject({
      method: "POST",
      url: "/cloud/events/import",
      payload: {
        caseId,
        provider: "aws",
        account: {
          provider: "aws",
          accountId: "123456789012",
          environment: "production",
          owner: "cloud-platform"
        },
        events: [...cloudTrail.Records, ...publicStorage.Records]
      }
    });
    expect(cloudImportResponse.statusCode).toBe(200);
    expect(cloudImportResponse.json().postureFindings.map((finding: { control: string }) => finding.control)).toEqual(
      expect.arrayContaining(["Privileged Role Change Review", "Public Storage Exposure"])
    );

    const identityImportResponse = await fastify.inject({
      method: "POST",
      url: "/identity/events/import",
      payload: {
        caseId,
        events: [...riskySignins.value, ...oktaMfaDisabled.events]
      }
    });
    expect(identityImportResponse.statusCode).toBe(200);
    expect(identityImportResponse.json().postureFindings.map((finding: { control: string }) => finding.control)).toEqual(
      expect.arrayContaining(["Risky Authentication Review", "MFA Enforcement"])
    );
    expect(JSON.stringify(identityImportResponse.json())).not.toMatch(/password|secret|token=/i);

    const postureResponse = await fastify.inject({
      method: "GET",
      url: "/cloud/posture"
    });
    expect(postureResponse.statusCode).toBe(200);
    expect(postureResponse.json().postureFindings.length).toBeGreaterThanOrEqual(4);

    const risksResponse = await fastify.inject({
      method: "GET",
      url: "/identity/risks"
    });
    expect(risksResponse.statusCode).toBe(200);
    expect(risksResponse.json().permissionRisks.map((risk: { riskyPermission: string }) => risk.riskyPermission)).toEqual(
      expect.arrayContaining(["mfa_disabled"])
    );
    expect(risksResponse.json().authAnomalies.length).toBeGreaterThan(0);

    const caseContextResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/cloud-context`
    });
    expect(caseContextResponse.statusCode).toBe(200);
    expect(caseContextResponse.json().cloudEvents).toHaveLength(4);
    expect(caseContextResponse.json().permissionRisks.length).toBeGreaterThan(0);

    const caseResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`
    });
    expect(caseResponse.json().result.timeline.map((event: { label: string }) => event.label).join(" ")).toContain(
      "identity"
    );
    expect(caseResponse.json().auditEntries.map((entry: { action: string }) => entry.action)).toContain(
      "cloud_context.imported"
    );
  });
});
