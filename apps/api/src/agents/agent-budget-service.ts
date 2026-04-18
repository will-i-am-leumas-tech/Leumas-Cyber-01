import type { AgentRoleId, AgentTaskStatus } from "../schemas/agents.schema";
import type { AgentBudget } from "../schemas/agents-v2.schema";
import { getAgentRoleContract } from "./agent-role-registry";

export interface AgentBudgetDecision {
  allowed: boolean;
  reason: string;
  budget: AgentBudget;
}

export function budgetForRole(role: AgentRoleId): AgentBudget {
  return getAgentRoleContract(role).budget;
}

export function evaluateAgentBudget(input: {
  role: AgentRoleId;
  durationMs: number;
  toolCallCount: number;
  memoryItemCount: number;
}): AgentBudgetDecision {
  const budget = budgetForRole(input.role);
  if (input.durationMs > budget.maxTaskMs) {
    return { allowed: false, reason: "task_timeout_budget_exceeded", budget };
  }
  if (input.toolCallCount > budget.maxToolCalls) {
    return { allowed: false, reason: "tool_call_budget_exceeded", budget };
  }
  if (input.memoryItemCount > budget.maxMemoryItems) {
    return { allowed: false, reason: "memory_budget_exceeded", budget };
  }

  return { allowed: true, reason: "within_budget", budget };
}

export function statusFromBudget(status: AgentTaskStatus, decision: AgentBudgetDecision): AgentTaskStatus {
  return decision.allowed ? status : "blocked";
}
