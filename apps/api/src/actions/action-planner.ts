import type { ActionPlan, CreateActionPlanInput } from "../schemas/actions.schema";
import { sha256Text } from "../reasoning/hash";
import { nowIso } from "../utils/time";
import { getToolManifestForOperation } from "../sandbox/tool-manifest-registry";
import { requiresApproval } from "./action-policy";

function summarizeParameters(parameters: Record<string, unknown>): string {
  const keys = Object.keys(parameters).sort();
  if (keys.length === 0) {
    return "No parameters.";
  }
  return `Parameter keys: ${keys.join(", ")}.`;
}

export function buildActionPlan(input: {
  caseId: string;
  index: number;
  plan: CreateActionPlanInput;
}): ActionPlan {
  const timestamp = nowIso();
  const planId = `action_plan_${String(input.index).padStart(3, "0")}`;
  const steps =
    input.plan.steps.length > 0
      ? input.plan.steps
      : [
          {
            title: "Create manual remediation task",
            connectorId: "manual",
            operation: "manual_review",
            parameters: {},
            risk: input.plan.risk,
            rollbackHint: "No automated change is performed."
          }
        ];

  return {
    id: planId,
    caseId: input.caseId,
    objective: input.plan.objective,
    risk: input.plan.risk,
    targetEntityIds: input.plan.targetEntityIds ?? [],
    expectedOutcome: input.plan.expectedOutcome,
    status: "planned",
    createdBy: input.plan.createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    steps: steps.map((step, stepIndex) => ({
      id: `action_step_${String(stepIndex + 1).padStart(3, "0")}`,
      title: step.title,
      connectorId: step.connectorId,
      operation: step.operation,
      parametersHash: sha256Text(JSON.stringify(step.parameters)),
      parameterSummary: summarizeParameters(step.parameters),
      risk: step.risk,
      approvalRequired: requiresApproval(step.risk) || Boolean(getToolManifestForOperation(step.connectorId, step.operation)?.approvalRequired),
      status: "planned",
      rollbackHint: step.rollbackHint
    }))
  };
}
