import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { dryRunActionPlan, executeActionPlan } from "../../apps/api/src/actions/action-executor";
import { buildActionPlan } from "../../apps/api/src/actions/action-planner";
import { evaluateActionPlanPolicy, hasApprovedActionPlan } from "../../apps/api/src/actions/action-policy";
import type { CreateActionPlanInput } from "../../apps/api/src/schemas/actions.schema";

describe("action services", () => {
  it("marks high-risk action steps as approval required", async () => {
    const input = JSON.parse(await readFile("data/fixtures/actions/mock-approved-action.json", "utf8")) as CreateActionPlanInput;
    const plan = buildActionPlan({ caseId: "case_test", index: 1, plan: input });

    expect(plan.steps[0].approvalRequired).toBe(true);
    expect(hasApprovedActionPlan(plan, [])).toBe(false);
  });

  it("blocks unsupported high-impact operations", async () => {
    const input = JSON.parse(await readFile("data/fixtures/actions/blocked-high-risk-action.json", "utf8")) as CreateActionPlanInput;
    const plan = buildActionPlan({ caseId: "case_test", index: 1, plan: input });
    const policy = evaluateActionPlanPolicy(plan);

    expect(policy.allowed).toBe(false);
    expect(policy.reason).toBe("operation_requires_future_safe_action_connector");
  });

  it("dry-runs and executes only no-op allowed actions", async () => {
    const input = JSON.parse(await readFile("data/fixtures/actions/manual-containment-plan.json", "utf8")) as CreateActionPlanInput;
    const plan = buildActionPlan({ caseId: "case_test", index: 1, plan: input });
    const dryRun = dryRunActionPlan(plan);
    const execution = executeActionPlan({ plan: dryRun, startingIndex: 1 });

    expect(dryRun.steps[0].dryRunResult).toContain("Dry run only");
    expect(execution.executions[0].status).toBe("success");
    expect(execution.executions[0].result).toContain("No external state was changed");
  });
});
