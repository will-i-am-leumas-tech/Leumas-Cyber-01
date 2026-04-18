import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import fixture from "../../apps/web/src/test-fixtures/case-workspace.json";
import longIndicatorsFixture from "../../apps/web/src/test-fixtures/long-indicators.json";
import { EntityGraph } from "../../apps/web/src/components/EntityGraph";
import { EvidencePanel } from "../../apps/web/src/components/EvidencePanel";
import { ReportEditor } from "../../apps/web/src/components/ReportEditor";
import { TaskBoard } from "../../apps/web/src/components/TaskBoard";
import type { CyberCase } from "../../apps/web/src/types";

const cyberCase = fixture as unknown as CyberCase;
const longIndicators = longIndicatorsFixture as Pick<NonNullable<CyberCase["result"]>, "indicators">;

describe("workspace components", () => {
  it("renders source-linked evidence with an inspector", () => {
    const html = renderToStaticMarkup(createElement(EvidencePanel, { cyberCase }));

    expect(html).toContain("Suspicious PowerShell Execution");
    expect(html).toContain("Evidence Inspector");
    expect(html).toContain("observation_001");
    expect(html).toContain("json:/");
  });

  it("renders entity graph relationships without a browser canvas", () => {
    const html = renderToStaticMarkup(createElement(EntityGraph, { cyberCase }));

    expect(html).toContain("process_creation");
    expect(html).toContain("ws-42");
    expect(html).toContain("Relationships");
  });

  it("renders task lanes and report editor controls", () => {
    const taskHtml = renderToStaticMarkup(
      createElement(TaskBoard, {
        tasks: cyberCase.tasks,
        findings: cyberCase.result?.reasoning?.findings ?? [],
        onCreateTask: async () => undefined,
        onUpdateTaskStatus: async () => undefined
      })
    );
    const reportHtml = renderToStaticMarkup(
      createElement(ReportEditor, {
        cyberCase,
        onCreateDraft: async () => undefined,
        onSaveDraft: async () => undefined,
        onCreateRedaction: async () => undefined
      })
    );

    expect(taskHtml).toContain("Add Task");
    expect(taskHtml).toContain("Collect process tree");
    expect(taskHtml).toContain("Done");
    expect(reportHtml).toContain("Save Report");
    expect(reportHtml).toContain("Workspace Fixture Report");
    expect(reportHtml).toContain("1 citations");
  });

  it("renders long indicators without truncating the evidence graph source text", () => {
    const caseWithLongIndicators = {
      ...cyberCase,
      result: cyberCase.result
        ? {
            ...cyberCase.result,
            indicators: [...cyberCase.result.indicators, ...longIndicators.indicators]
          }
        : cyberCase.result
    } as CyberCase;
    const html = renderToStaticMarkup(createElement(EntityGraph, { cyberCase: caseWithLongIndicators }));

    expect(html).toContain("very-long-suspicious-subdomain-used-for-layout-regression-testing.example-threat.test");
  });
});
