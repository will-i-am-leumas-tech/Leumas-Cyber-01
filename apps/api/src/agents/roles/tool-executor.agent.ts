import type { CyberCase } from "../../schemas/case.schema";
import { getAgentRole } from "../agent-task-service";

export function runToolExecutorAgent(cyberCase: CyberCase): Record<string, unknown> {
  const role = getAgentRole("toolExecutor");
  return {
    allowedTools: role.allowedTools,
    observedToolCalls: cyberCase.toolCalls.length,
    deniedToolCalls: cyberCase.toolCalls.filter((toolCall) => toolCall.status === "denied").length
  };
}
