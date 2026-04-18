import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-cross-tenant-"));
  app = await createApp({ dataDir, authRequired: true });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("cross-tenant access controls", () => {
  it("denies a tenant-partner user from default-tenant case data even with case membership", async () => {
    const fastify = await createTestApp();
    const analyze = await fastify.inject({
      method: "POST",
      url: "/analyze",
      headers: {
        "x-dev-user": "admin@example.test"
      },
      payload: {
        mode: "logs",
        text: "2026-04-18T10:00:00Z failed login user=admin src=203.0.113.10"
      }
    });
    const caseId = analyze.json().caseId;

    const membership = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/members`,
      headers: {
        "x-dev-user": "admin@example.test"
      },
      payload: {
        userId: "user_partner",
        role: "analyst",
        teamId: "team_partner"
      }
    });
    expect(membership.statusCode).toBe(200);

    const denied = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`,
      headers: {
        "x-dev-user": "partner@example.test"
      }
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toMatchObject({
      error: "permission_denied",
      reason: "Tenant boundary denied the request."
    });
  });
});
