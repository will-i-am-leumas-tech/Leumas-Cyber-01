import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-auth-"));
  app = await createApp({ dataDir, authRequired: true });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("enterprise access control flow", () => {
  it("requires dev auth, enforces case membership, and records actor metadata", async () => {
    const fastify = await createTestApp();

    const unauthenticated = await fastify.inject({
      method: "GET",
      url: "/cases"
    });
    expect(unauthenticated.statusCode).toBe(401);

    const login = await fastify.inject({
      method: "POST",
      url: "/auth/dev-login",
      payload: {
        user: "admin@example.test"
      }
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().header).toEqual({ name: "x-dev-user", value: "admin@example.test" });

    const analyze = await fastify.inject({
      method: "POST",
      url: "/analyze",
      headers: {
        "x-dev-user": "admin@example.test"
      },
      payload: {
        mode: "logs",
        text: "2026-04-16T09:00:00Z failed login user=admin src=203.0.113.10"
      }
    });
    expect(analyze.statusCode).toBe(200);
    const caseId = analyze.json().caseId;

    const analystDenied = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`,
      headers: {
        "x-dev-user": "analyst@example.test"
      }
    });
    expect(analystDenied.statusCode).toBe(403);

    const membership = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/members`,
      headers: {
        "x-dev-user": "admin@example.test"
      },
      payload: {
        userId: "user_analyst",
        role: "analyst",
        teamId: "team_secops"
      }
    });
    expect(membership.statusCode).toBe(200);
    expect(membership.json().member.userId).toBe("user_analyst");
    expect(membership.json().case.auditEntries.at(-1).metadata.actor).toBe("admin@example.test");

    const analystAllowed = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`,
      headers: {
        "x-dev-user": "analyst@example.test"
      }
    });
    expect(analystAllowed.statusCode).toBe(200);

    const analystAuditDenied = await fastify.inject({
      method: "GET",
      url: "/audit/events",
      headers: {
        "x-dev-user": "analyst@example.test"
      }
    });
    expect(analystAuditDenied.statusCode).toBe(403);

    const auditorAuditAllowed = await fastify.inject({
      method: "GET",
      url: "/audit/events",
      headers: {
        "x-dev-user": "auditor@example.test"
      }
    });
    expect(auditorAuditAllowed.statusCode).toBe(200);
    expect(auditorAuditAllowed.json().integrity.verified).toBe(true);
  });
});
