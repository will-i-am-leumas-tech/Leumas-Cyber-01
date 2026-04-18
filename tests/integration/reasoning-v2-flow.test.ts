import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-reasoning-v2-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("reasoning v2 flow", () => {
  it("persists reasoning v2 artifacts and records analyst reviews", async () => {
    const fastify = await createTestApp();

    const analyze = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: [
          "2026-04-16T09:00:00Z failed login user=admin src=203.0.113.10",
          "2026-04-16T09:00:15Z failed login user=admin src=203.0.113.10",
          "2026-04-16T09:00:31Z failed login user=admin src=203.0.113.10",
          "2026-04-16T09:01:02Z successful login user=admin src=203.0.113.10"
        ].join("\n"),
        useKnowledge: false
      }
    });
    expect(analyze.statusCode).toBe(200);
    const caseId = analyze.json().caseId;

    const reasoning = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/reasoning/v2`
    });
    expect(reasoning.statusCode).toBe(200);
    expect(reasoning.json().hypothesisNodes.length).toBeGreaterThan(0);
    expect(reasoning.json().unknownRecords.length).toBeGreaterThan(0);
    expect(reasoning.json().techniqueMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          techniqueId: "T1110"
        })
      ])
    );

    const review = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/reasoning/review`,
      payload: {
        targetType: "hypothesis",
        targetId: reasoning.json().hypothesisNodes[0].id,
        status: "needs_more_evidence",
        reviewer: "lead@example.test",
        notes: "Confirm whether the login was authorized before closing the case."
      }
    });
    expect(review.statusCode).toBe(200);
    expect(review.json().review).toMatchObject({
      targetType: "hypothesis",
      status: "needs_more_evidence",
      reviewer: "lead@example.test"
    });

    const updated = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`
    });
    expect(updated.json().reasoningReviews).toHaveLength(1);
    expect(updated.json().auditEntries.map((entry: { action: string }) => entry.action)).toContain("reasoning.reviewed");
  });
});
