import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { analyzeAlertOrLogs } from "../../apps/api/src/adapters/log-analyzer.adapter";
import { canTransitionCaseState, validateCaseStateTransition } from "../../apps/api/src/workflow/case-state-machine";
import { generateDefaultTasks } from "../../apps/api/src/workflow/task-service";
import type { InvestigationTask } from "../../apps/api/src/schemas/workflow.schema";

describe("workflow services", () => {
  it("allows valid state transitions and rejects invalid ones", async () => {
    const invalid = JSON.parse(await readFile("data/fixtures/workflow/invalid-transition.json", "utf8")) as {
      from: "new";
      to: "remediating";
    };

    expect(canTransitionCaseState("new", "triaging")).toBe(true);
    expect(canTransitionCaseState(invalid.from, invalid.to)).toBe(false);
  });

  it("generates default PowerShell investigation tasks", async () => {
    const expected = JSON.parse(await readFile("data/fixtures/workflow/default-powershell-tasks.json", "utf8")) as {
      requiredTaskTitles: string[];
    };
    const alert = await readFile("data/fixtures/alerts/powershell-encoded.json", "utf8");
    const result = {
      ...analyzeAlertOrLogs(alert, "alert"),
      reportMarkdown: ""
    };

    const tasks = generateDefaultTasks(result);

    expect(tasks.map((task) => task.title)).toEqual(expect.arrayContaining(expected.requiredTaskTitles));
    expect(tasks.every((task) => task.status === "open")).toBe(true);
  });

  it("blocks closure while required tasks are open without override decision", () => {
    const tasks: InvestigationTask[] = [
      {
        id: "task_001",
        title: "Required task",
        priority: "high",
        status: "open",
        linkedFindingIds: [],
        required: true,
        createdAt: "2026-04-16T00:00:00.000Z",
        updatedAt: "2026-04-16T00:00:00.000Z"
      }
    ];

    const blocked = validateCaseStateTransition({
      from: "triaging",
      to: "closed",
      tasks,
      decisions: []
    });
    const allowed = validateCaseStateTransition({
      from: "triaging",
      to: "closed",
      tasks,
      decisions: [
        {
          id: "decision_001",
          decisionType: "closure_override",
          decision: "Close with documented override",
          rationale: "Duplicate case.",
          approver: "lead",
          evidenceRefs: [],
          timestamp: "2026-04-16T00:00:00.000Z"
        }
      ]
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain("required tasks");
    expect(allowed.allowed).toBe(true);
  });
});
