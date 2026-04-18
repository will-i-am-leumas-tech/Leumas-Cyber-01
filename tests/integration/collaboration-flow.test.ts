import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-collaboration-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("collaboration flow", () => {
  it("builds SOC queue data, audited notes, approval queue entries, and dashboard metrics", async () => {
    const fastify = await createTestApp();
    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: "2026-04-18T09:00:00Z failed login user=admin src=203.0.113.10"
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    const caseId = analyzeResponse.json().caseId;

    const actionResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/action-plans`,
      payload: {
        objective: "Prepare host containment review",
        risk: "high",
        expectedOutcome: "Containment is reviewed before any high-impact action.",
        createdBy: "analyst",
        steps: [
          {
            title: "Prepare EDR containment",
            connectorId: "manual",
            operation: "create_ticket",
            parameters: { host: "ws-42" },
            risk: "high",
            rollbackHint: "Release host from isolation after lead approval."
          }
        ]
      }
    });
    expect(actionResponse.statusCode).toBe(200);
    const planId = actionResponse.json().actionPlan.id;

    const approvalResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/action-plans/${planId}/approval`,
      payload: {
        approverRole: "lead",
        requestedBy: "analyst",
        status: "pending",
        reason: "High-impact containment requires lead review."
      }
    });
    expect(approvalResponse.statusCode).toBe(200);

    const noteResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/notes`,
      payload: {
        author: "analyst",
        text: "Review with secops@example.test before containment.",
        mentions: ["lead"],
        visibility: "case"
      }
    });
    expect(noteResponse.statusCode).toBe(200);
    expect(noteResponse.json().note.text).toContain("[REDACTED_EMAIL_001]");
    expect(noteResponse.json().note.redacted).toBe(true);
    expect(noteResponse.json().case.auditEntries.map((entry: { action: string }) => entry.action)).toContain(
      "collaboration.note_created"
    );

    const queueResponse = await fastify.inject({
      method: "GET",
      url: "/cases/queue"
    });
    expect(queueResponse.statusCode).toBe(200);
    const queueItem = queueResponse.json().cases.find((item: { caseId: string }) => item.caseId === caseId);
    expect(queueItem.noteCount).toBe(1);
    expect(queueItem.approvalCount).toBe(1);
    expect(queueItem.flags).toContain("approval_pending");

    const approvalsResponse = await fastify.inject({
      method: "GET",
      url: "/approvals"
    });
    expect(approvalsResponse.statusCode).toBe(200);
    expect(approvalsResponse.json().approvals[0]).toMatchObject({
      caseId,
      sourceType: "action",
      status: "pending"
    });

    const dashboardResponse = await fastify.inject({
      method: "GET",
      url: "/admin/dashboards/model-quality"
    });
    expect(dashboardResponse.statusCode).toBe(200);
    expect(dashboardResponse.json().metrics.map((metric: { name: string }) => metric.name)).toEqual(
      expect.arrayContaining(["cases_total", "provider_calls_total", "grounding_findings_total"])
    );
  });
});
