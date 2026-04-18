import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import fixture from "../../apps/web/src/test-fixtures/case-workspace.json";
import { AnalystNotes } from "../../apps/web/src/components/AnalystNotes";
import { ApprovalQueue } from "../../apps/web/src/components/ApprovalQueue";
import { CaseQueue } from "../../apps/web/src/components/CaseQueue";
import { CitationInspector } from "../../apps/web/src/components/CitationInspector";
import { ModelQualityDashboard } from "../../apps/web/src/components/ModelQualityDashboard";
import { TimelineExplorer } from "../../apps/web/src/components/TimelineExplorer";
import type { ApprovalQueueItem, CaseQueueItem, CyberCase } from "../../apps/web/src/types";

const cyberCase = fixture as unknown as CyberCase;

describe("SOC analyst components", () => {
  it("renders queue, approvals, notes, citations, timeline, and dashboard panels", () => {
    const queueItems: CaseQueueItem[] = [
      {
        caseId: cyberCase.id,
        title: cyberCase.title,
        severity: cyberCase.severity,
        priority: cyberCase.priority,
        state: cyberCase.state,
        slaStatus: "watch",
        flags: ["approval_pending"],
        updatedAt: cyberCase.updatedAt,
        openTaskCount: 1,
        approvalCount: 1,
        noteCount: 1,
        safetyDecisionCount: 1
      }
    ];
    const approvals: ApprovalQueueItem[] = [
      {
        id: "approval_1",
        caseId: cyberCase.id,
        title: "Contain host",
        sourceType: "action",
        targetId: "plan_1",
        risk: "high",
        status: "pending",
        reason: "Lead review.",
        createdAt: cyberCase.createdAt
      }
    ];
    const caseWithKnowledge = {
      ...cyberCase,
      knowledgeCitationQualities: [
        {
          citationId: "chunk_1",
          sourceId: "source_1",
          relevance: 0.9,
          freshness: 1,
          trust: 1,
          warnings: []
        }
      ],
      result: cyberCase.result
        ? {
            ...cyberCase.result,
            knowledge: {
              query: "powershell",
              results: [
                {
                  chunkId: "chunk_1",
                  score: 0.9,
                  excerpt: "Enable PowerShell logging.",
                  citation: {
                    sourceId: "source_1",
                    title: "Windows Logging Baseline",
                    uri: "local://knowledge/windows-logging",
                    location: "PowerShell lines 1-3",
                    trustTier: "internal",
                    version: "2026.1",
                    stale: false
                  }
                }
              ],
              snapshots: [],
              warnings: []
            }
          }
        : cyberCase.result
    } as CyberCase;

    const queueHtml = renderToStaticMarkup(createElement(CaseQueue, { items: queueItems, onSelect: () => undefined }));
    const approvalsHtml = renderToStaticMarkup(createElement(ApprovalQueue, { approvals }));
    const notesHtml = renderToStaticMarkup(
      createElement(AnalystNotes, {
        notes: [
          {
            id: "note_1",
            caseId: cyberCase.id,
            author: "analyst",
            text: "Lead review requested.",
            mentions: ["lead"],
            visibility: "case",
            reviewStatus: "open",
            redacted: false,
            createdAt: cyberCase.createdAt,
            updatedAt: cyberCase.updatedAt
          }
        ],
        onCreate: async () => undefined
      })
    );
    const citationsHtml = renderToStaticMarkup(createElement(CitationInspector, { cyberCase: caseWithKnowledge }));
    const timelineHtml = renderToStaticMarkup(createElement(TimelineExplorer, { events: cyberCase.result?.timeline ?? [] }));
    const dashboardHtml = renderToStaticMarkup(
      createElement(ModelQualityDashboard, {
        activeProvider: "local-mock",
        metrics: [
          { name: "provider_calls_total", value: 1, labels: {}, window: "current" },
          { name: "provider_failures_total", value: 0, labels: {}, window: "current" },
          { name: "grounding_findings_total", value: 2, labels: {}, window: "current" },
          { name: "grounding_findings_weak", value: 0, labels: {}, window: "current" }
        ],
        providers: [
          {
            provider: "local-mock",
            model: "mock",
            status: "healthy",
            latencyMs: 0,
            checkedAt: cyberCase.updatedAt,
            message: "Ready"
          }
        ],
        usage: []
      })
    );

    expect(queueHtml).toContain("Case Queue");
    expect(approvalsHtml).toContain("Operator Approvals");
    expect(notesHtml).toContain("Analyst Notes");
    expect(citationsHtml).toContain("Windows Logging Baseline");
    expect(timelineHtml).toContain("Filter timeline");
    expect(dashboardHtml).toContain("Model Quality");
  });
});
