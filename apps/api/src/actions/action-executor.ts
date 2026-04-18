import type { ActionExecution, ActionPlan, ActionStep } from "../schemas/actions.schema";
import { getToolManifestForOperation } from "../sandbox/tool-manifest-registry";
import { nowIso } from "../utils/time";
import { evaluateActionStepPolicy } from "./action-policy";

export function dryRunActionPlan(plan: ActionPlan): ActionPlan {
  return {
    ...plan,
    status: "dry_run_ready",
    updatedAt: nowIso(),
    steps: plan.steps.map((step) => ({
      ...step,
      status: "dry_run_ready",
      dryRunResult: `Dry run only. Would perform ${step.operation} through ${step.connectorId}. ${step.parameterSummary}`
    }))
  };
}

function executeStep(plan: ActionPlan, step: ActionStep, index: number): ActionExecution {
  const policy = evaluateActionStepPolicy(step);
  const manifest = getToolManifestForOperation(step.connectorId, step.operation);
  if (!policy.allowed) {
    return {
      id: `action_execution_${String(index).padStart(3, "0")}`,
      actionPlanId: plan.id,
      actionStepId: step.id,
      status: "blocked",
      result: `Execution blocked by policy: ${policy.reason}.`,
      rollbackHint: step.rollbackHint,
      timestamp: nowIso()
    };
  }

  return {
    id: `action_execution_${String(index).padStart(3, "0")}`,
    actionPlanId: plan.id,
    actionStepId: step.id,
    status: "success",
    result: `Sandbox-gated mock executor completed no-op ${step.operation}${
      manifest ? ` under manifest ${manifest.id}` : ""
    }. No external state was changed.`,
    rollbackHint: step.rollbackHint ?? "No rollback required for no-op mock execution.",
    timestamp: nowIso()
  };
}

export function executeActionPlan(input: { plan: ActionPlan; startingIndex: number }): {
  plan: ActionPlan;
  executions: ActionExecution[];
} {
  const executions = input.plan.steps.map((step, stepIndex) => executeStep(input.plan, step, input.startingIndex + stepIndex));
  const allSuccess = executions.every((execution) => execution.status === "success");

  return {
    plan: {
      ...input.plan,
      status: allSuccess ? "executed" : "blocked",
      updatedAt: nowIso(),
      steps: input.plan.steps.map((step, index) => ({
        ...step,
        status: executions[index].status === "success" ? "executed" : "blocked"
      }))
    },
    executions
  };
}
