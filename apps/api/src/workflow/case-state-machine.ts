import type { CaseState, DecisionRecord, InvestigationTask, WorkflowTransition } from "../schemas/workflow.schema";
import { nowIso } from "../utils/time";

const allowedTransitions: Record<CaseState, CaseState[]> = {
  new: ["triaging", "closed"],
  triaging: ["investigating", "contained", "closed"],
  investigating: ["contained", "remediating", "monitoring", "closed"],
  contained: ["remediating", "monitoring", "closed"],
  remediating: ["monitoring", "closed"],
  monitoring: ["investigating", "closed"],
  closed: []
};

export function canTransitionCaseState(from: CaseState, to: CaseState): boolean {
  return allowedTransitions[from].includes(to);
}

export function hasOpenRequiredTasks(tasks: InvestigationTask[]): boolean {
  return tasks.some((task) => task.required && task.status !== "done" && task.status !== "cancelled");
}

export function hasClosureOverride(decisions: DecisionRecord[]): boolean {
  return decisions.some((decision) => decision.decisionType === "closure_override");
}

export function validateCaseStateTransition(input: {
  from: CaseState;
  to: CaseState;
  tasks: InvestigationTask[];
  decisions: DecisionRecord[];
}): { allowed: boolean; reason?: string } {
  if (!canTransitionCaseState(input.from, input.to)) {
    return {
      allowed: false,
      reason: `Transition from ${input.from} to ${input.to} is not allowed.`
    };
  }

  if (input.to === "closed" && hasOpenRequiredTasks(input.tasks) && !hasClosureOverride(input.decisions)) {
    return {
      allowed: false,
      reason: "Cannot close case while required tasks are open unless a closure override decision is recorded."
    };
  }

  return { allowed: true };
}

export function buildWorkflowTransition(input: {
  index: number;
  from: CaseState;
  to: CaseState;
  actor: string;
  reason: string;
}): WorkflowTransition {
  return {
    id: `transition_${String(input.index).padStart(3, "0")}`,
    from: input.from,
    to: input.to,
    actor: input.actor,
    reason: input.reason,
    timestamp: nowIso()
  };
}
