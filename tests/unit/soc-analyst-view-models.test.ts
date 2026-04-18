import { describe, expect, it } from "vitest";
import fixture from "../../apps/web/src/test-fixtures/case-workspace.json";
import type { ApprovalQueueItem, CaseQueueItem, CyberCase } from "../../apps/web/src/types";
import { groupApprovalsByStatus, pendingApprovalCount } from "../../apps/web/src/workspace/approval-view-model";
import { filterCaseQueue, summarizeCaseQueue } from "../../apps/web/src/workspace/case-queue-view-model";
import { buildEntityGraph } from "../../apps/web/src/workspace/view-model";

const cyberCase = fixture as unknown as CyberCase;

describe("SOC analyst view models", () => {
  it("summarizes and filters case queue items", () => {
    const queueItems: CaseQueueItem[] = [
      {
        caseId: "case_high",
        title: "High Severity Review",
        severity: "high",
        priority: "high",
        state: "investigating",
        slaStatus: "overdue",
        flags: ["approval_pending", "grounding_review"],
        updatedAt: "2026-04-18T10:00:00.000Z",
        openTaskCount: 2,
        approvalCount: 1,
        noteCount: 1,
        safetyDecisionCount: 1
      },
      {
        caseId: "case_low",
        title: "Routine Review",
        severity: "low",
        priority: "low",
        state: "closed",
        slaStatus: "ok",
        flags: [],
        updatedAt: "2026-04-18T09:00:00.000Z",
        openTaskCount: 0,
        approvalCount: 0,
        noteCount: 0,
        safetyDecisionCount: 1
      }
    ];

    expect(summarizeCaseQueue(queueItems)).toMatchObject({
      total: 2,
      open: 1,
      highPriority: 1,
      overdue: 1,
      pendingApprovals: 1
    });
    expect(
      filterCaseQueue(queueItems, {
        search: "approval",
        state: "",
        severity: "high",
        flags: ["approval_pending"]
      }).map((item) => item.caseId)
    ).toEqual(["case_high"]);
  });

  it("groups approvals and filters the evidence graph", () => {
    const approvals: ApprovalQueueItem[] = [
      {
        id: "approval_1",
        caseId: "case_1",
        title: "Contain host",
        sourceType: "action",
        targetId: "plan_1",
        risk: "high",
        status: "pending",
        reason: "Lead review.",
        createdAt: "2026-04-18T10:00:00.000Z"
      },
      {
        id: "approval_2",
        caseId: "case_2",
        title: "Sandbox run",
        sourceType: "sandbox",
        targetId: "sandbox_1",
        risk: "medium",
        status: "approved",
        reason: "Approved.",
        createdAt: "2026-04-18T09:00:00.000Z"
      }
    ];
    const graph = buildEntityGraph(cyberCase, { query: "ws-42", types: ["entity"] });

    expect(pendingApprovalCount(approvals)).toBe(1);
    expect(groupApprovalsByStatus(approvals).find((lane) => lane.status === "pending")?.items).toHaveLength(1);
    expect(graph.nodes.every((node) => node.type === "entity")).toBe(true);
    expect(graph.nodes.map((node) => node.label)).toContain("ws-42");
  });
});
