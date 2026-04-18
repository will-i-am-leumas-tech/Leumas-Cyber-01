import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-access-control-v2-"));
  app = await createApp({ dataDir, authRequired: true });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("access control v2 flow", () => {
  it("enforces tenants, issues scoped service accounts, and reviews break-glass access", async () => {
    const fastify = await createTestApp();

    const me = await fastify.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        "x-dev-user": "admin@example.test"
      }
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().tenantIds).toEqual(expect.arrayContaining(["tenant_default"]));

    const serviceAccount = await fastify.inject({
      method: "POST",
      url: "/admin/service-accounts",
      headers: {
        "x-dev-user": "admin@example.test"
      },
      payload: {
        tenantId: "tenant_default",
        name: "CI Reader",
        owner: "platform",
        scopes: ["case:read"],
        expiresAt: "2026-12-31T00:00:00.000Z"
      }
    });
    expect(serviceAccount.statusCode).toBe(200);
    expect(serviceAccount.json().issuedCredential).toMatch(/^svc_/);
    expect(serviceAccount.json().serviceAccount.scopes).toEqual(["case:read"]);

    const analystDeniedAdmin = await fastify.inject({
      method: "POST",
      url: "/admin/service-accounts",
      headers: {
        "x-dev-user": "analyst@example.test"
      },
      payload: {
        tenantId: "tenant_default",
        name: "Denied Account",
        owner: "platform",
        scopes: ["case:read"],
        expiresAt: "2026-12-31T00:00:00.000Z"
      }
    });
    expect(analystDeniedAdmin.statusCode).toBe(403);

    const analyze = await fastify.inject({
      method: "POST",
      url: "/analyze",
      headers: {
        "x-dev-user": "admin@example.test"
      },
      payload: {
        mode: "logs",
        text: "2026-04-18T09:00:00Z failed login user=admin src=203.0.113.10"
      }
    });
    expect(analyze.statusCode).toBe(200);
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

    const partnerDenied = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`,
      headers: {
        "x-dev-user": "partner@example.test"
      }
    });
    expect(partnerDenied.statusCode).toBe(403);
    expect(partnerDenied.json().reason).toContain("Tenant boundary");

    const breakGlass = await fastify.inject({
      method: "POST",
      url: "/admin/break-glass",
      headers: {
        "x-dev-user": "admin@example.test"
      },
      payload: {
        userId: "user_partner",
        tenantId: "tenant_default",
        reason: "Emergency review of a default-tenant case during an active incident handoff.",
        expiresAt: "2026-04-19T00:00:00.000Z"
      }
    });
    expect(breakGlass.statusCode).toBe(200);

    const review = await fastify.inject({
      method: "POST",
      url: `/admin/break-glass/${breakGlass.json().breakGlassGrant.id}/review`,
      headers: {
        "x-dev-user": "admin@example.test"
      },
      payload: {
        approver: "admin@example.test",
        approved: true
      }
    });
    expect(review.statusCode).toBe(200);
    expect(review.json().breakGlassGrant.active).toBe(true);

    const partnerAllowed = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`,
      headers: {
        "x-dev-user": "partner@example.test"
      }
    });
    expect(partnerAllowed.statusCode).toBe(200);

    const decisions = await fastify.inject({
      method: "GET",
      url: "/admin/access-decisions",
      headers: {
        "x-dev-user": "admin@example.test"
      }
    });
    expect(decisions.statusCode).toBe(200);
    expect(decisions.json().accessDecisions.some((decision: { allowed: boolean }) => !decision.allowed)).toBe(true);
  });
});
