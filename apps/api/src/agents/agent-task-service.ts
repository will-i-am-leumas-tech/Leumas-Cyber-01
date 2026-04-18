import type { AgentRole, AgentRoleId, AgentTask, OrchestrationRun } from "../schemas/agents.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export const agentRoles: AgentRole[] = [
  {
    id: "parser",
    displayName: "Parser Agent",
    description: "Summarizes normalized artifacts, events, entities, and parser warnings.",
    allowedTools: [],
    maxTimeoutMs: 1500
  },
  {
    id: "investigator",
    displayName: "Investigator Agent",
    description: "Reviews structured findings and case severity without tool execution.",
    allowedTools: [],
    maxTimeoutMs: 2000
  },
  {
    id: "retriever",
    displayName: "Retriever Agent",
    description: "Summarizes already-retrieved knowledge context and citations.",
    allowedTools: ["knowledge.search"],
    maxTimeoutMs: 2000
  },
  {
    id: "reporter",
    displayName: "Reporter Agent",
    description: "Checks report structure and export readiness.",
    allowedTools: [],
    maxTimeoutMs: 1500
  },
  {
    id: "safetyReviewer",
    displayName: "Safety Reviewer Agent",
    description: "Validates final agent-visible output for unsafe cyber content.",
    allowedTools: [],
    maxTimeoutMs: 1500
  },
  {
    id: "toolExecutor",
    displayName: "Tool Executor Agent",
    description: "Summarizes tool activity under a strict connector permission boundary.",
    allowedTools: ["mock-siem.search_events"],
    maxTimeoutMs: 2000
  }
];

const schemaByRole: Record<AgentRoleId, string> = {
  parser: "ParserAgentOutput",
  investigator: "InvestigatorAgentOutput",
  retriever: "RetrieverAgentOutput",
  reporter: "ReporterAgentOutput",
  safetyReviewer: "SafetyReviewAgentOutput",
  toolExecutor: "ToolExecutorAgentOutput"
};

export function getAgentRole(roleId: AgentRoleId): AgentRole {
  return agentRoles.find((role) => role.id === roleId) as AgentRole;
}

export function canRoleUseTool(roleId: AgentRoleId, toolRef: string): boolean {
  return getAgentRole(roleId).allowedTools.includes(toolRef);
}

export function buildOrchestrationRun(caseId: string, plan = "standard-log-plan"): OrchestrationRun {
  return {
    id: createId("orchestration"),
    caseId,
    plan,
    taskIds: [],
    finalStatus: "planned",
    createdAt: nowIso()
  };
}

export function buildAgentTask(input: {
  caseId: string;
  runId: string;
  role: AgentRoleId;
  inputArtifactRefs: string[];
  index: number;
}): AgentTask {
  const role = getAgentRole(input.role);
  const now = nowIso();
  return {
    id: `${input.runId}_task_${String(input.index).padStart(3, "0")}`,
    caseId: input.caseId,
    runId: input.runId,
    role: input.role,
    inputArtifactRefs: input.inputArtifactRefs,
    expectedSchema: schemaByRole[input.role],
    status: "queued",
    timeoutMs: role.maxTimeoutMs,
    createdAt: now,
    updatedAt: now
  };
}

export function standardAgentRoles(): AgentRoleId[] {
  return ["parser", "investigator", "retriever", "reporter", "safetyReviewer", "toolExecutor"];
}
