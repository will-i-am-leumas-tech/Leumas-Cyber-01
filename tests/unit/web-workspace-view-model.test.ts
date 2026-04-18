import { describe, expect, it } from "vitest";
import fixture from "../../apps/web/src/test-fixtures/case-workspace.json";
import type { CyberCase } from "../../apps/web/src/types";
import {
  activeReportDraft,
  buildEntityGraph,
  buildEvidenceViewModel,
  buildWorkspaceStats,
  filterTimelineEvents,
  groupTasksByStatus
} from "../../apps/web/src/workspace/view-model";

const cyberCase = fixture as unknown as CyberCase;

describe("workspace view model", () => {
  it("links findings to source observations and normalized evidence", () => {
    const viewModel = buildEvidenceViewModel(cyberCase);

    expect(viewModel.findings).toHaveLength(1);
    expect(viewModel.findings[0].title).toBe("Suspicious PowerShell Execution");
    expect(viewModel.findings[0].observations.map((observation) => observation.id)).toEqual([
      "observation_001",
      "observation_002"
    ]);
    expect(viewModel.entities.map((entity) => entity.normalized)).toContain("ws-42");
  });

  it("builds a stable entity graph from events, entities, indicators, and findings", () => {
    const graph = buildEntityGraph(cyberCase);

    expect(graph.nodes.some((node) => node.label === "ws-42" && node.type === "entity")).toBe(true);
    expect(graph.nodes.some((node) => node.label === "process_creation" && node.type === "event")).toBe(true);
    expect(graph.edges.some((edge) => edge.label === "observed")).toBe(true);
  });

  it("groups tasks by status and reports workspace stats", () => {
    const lanes = groupTasksByStatus(cyberCase.tasks);
    const stats = buildWorkspaceStats(cyberCase);

    expect(lanes.find((lane) => lane.status === "open")?.tasks).toHaveLength(1);
    expect(lanes.find((lane) => lane.status === "done")?.tasks).toHaveLength(1);
    expect(stats).toMatchObject({
      findingCount: 1,
      entityCount: 3,
      eventCount: 1,
      taskCount: 2,
      openTaskCount: 1,
      reportDraftCount: 1,
      safetyDecisionCount: 1
    });
  });

  it("filters timeline events and selects the latest report draft", () => {
    expect(filterTimelineEvents(cyberCase.result?.timeline ?? [], { query: "WS-42" })).toHaveLength(1);
    expect(filterTimelineEvents(cyberCase.result?.timeline ?? [], { query: "not-present" })).toHaveLength(0);
    expect(activeReportDraft(cyberCase)?.id).toBe("report_001");
  });
});
