import type { AgentResult, AgentTask } from "../schemas/agents.schema";
import type { AgentTrace } from "../schemas/agents-v2.schema";
import { createId } from "../utils/ids";

export function buildAgentTrace(input: {
  task: AgentTask;
  result: AgentResult;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  toolRefs?: string[];
  policyDecisions?: string[];
}): AgentTrace {
  return {
    id: createId("agent_trace"),
    caseId: input.task.caseId,
    runId: input.task.runId,
    taskId: input.task.id,
    role: input.task.role,
    inputRefs: input.task.inputArtifactRefs,
    outputRefs: [input.result.id],
    toolRefs: input.toolRefs ?? [],
    policyDecisions: input.policyDecisions ?? [],
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationMs: input.durationMs,
    status: input.task.status
  };
}
