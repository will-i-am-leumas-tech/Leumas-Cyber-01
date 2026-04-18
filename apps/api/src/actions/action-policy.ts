import type { ActionPlan, ActionRisk, ActionStep, ApprovalRequest } from "../schemas/actions.schema";
import { getToolManifestForOperation } from "../sandbox/tool-manifest-registry";

const allowedOperations = new Set(["manual_review", "create_ticket", "add_watchlist_entry", "collect_triage_package"]);
const blockedOperations = new Set(["isolate_host", "disable_account", "firewall_block", "delete_data", "run_shell_command"]);
const blockedTargetEntityPrefixes = ["external-target:", "unauthorized:"];

export function requiresApproval(risk: ActionRisk): boolean {
  return risk === "high" || risk === "critical";
}

export function evaluateActionStepPolicy(step: ActionStep): { allowed: boolean; reason?: string } {
  if (blockedOperations.has(step.operation)) {
    return {
      allowed: false,
      reason: "operation_requires_future_safe_action_connector"
    };
  }

  if (!allowedOperations.has(step.operation)) {
    return {
      allowed: false,
      reason: "operation_not_allowed"
    };
  }

  const manifest = getToolManifestForOperation(step.connectorId, step.operation);
  if (manifest && manifest.approvalRequired && !step.approvalRequired) {
    return {
      allowed: false,
      reason: "sandbox_manifest_requires_approval"
    };
  }

  return { allowed: true };
}

export function evaluateActionPlanPolicy(plan: ActionPlan): { allowed: boolean; reason?: string } {
  if (plan.targetEntityIds.some((entityId) => blockedTargetEntityPrefixes.some((prefix) => entityId.startsWith(prefix)))) {
    return {
      allowed: false,
      reason: "target_out_of_scope"
    };
  }

  for (const step of plan.steps) {
    const stepPolicy = evaluateActionStepPolicy(step);
    if (!stepPolicy.allowed) {
      return stepPolicy;
    }
  }

  return { allowed: true };
}

export function hasApprovedActionPlan(plan: ActionPlan, approvals: ApprovalRequest[]): boolean {
  if (!plan.steps.some((step) => step.approvalRequired)) {
    return true;
  }

  return approvals.some((approval) => approval.actionPlanId === plan.id && approval.status === "approved");
}
