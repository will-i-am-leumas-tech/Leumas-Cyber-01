import type { AgentRoleId } from "../schemas/agents.schema";
import { agentRoleContractSchema, type AgentRoleContract } from "../schemas/agents-v2.schema";

const contracts: AgentRoleContract[] = [
  {
    id: "parser",
    domain: "evidence-normalization",
    allowedTasks: ["summarize-normalized-events", "count-parser-warnings"],
    requiredEvidence: ["ingestion.artifacts", "ingestion.normalizedEvents"],
    outputSchema: "ParserAgentOutput",
    budget: { maxTaskMs: 1500, maxToolCalls: 0, maxMemoryItems: 5 },
    safetyRequirements: ["read-only", "case-scoped"]
  },
  {
    id: "investigator",
    domain: "case-reasoning",
    allowedTasks: ["review-findings", "summarize-severity", "identify-unknowns"],
    requiredEvidence: ["reasoning.observations", "reasoning.findings"],
    outputSchema: "InvestigatorAgentOutput",
    budget: { maxTaskMs: 2000, maxToolCalls: 0, maxMemoryItems: 8 },
    safetyRequirements: ["evidence-backed-findings", "no-action-execution"]
  },
  {
    id: "retriever",
    domain: "knowledge-grounding",
    allowedTasks: ["summarize-retrieved-citations"],
    requiredEvidence: ["knowledge.results"],
    outputSchema: "RetrieverAgentOutput",
    budget: { maxTaskMs: 2000, maxToolCalls: 1, maxMemoryItems: 8 },
    safetyRequirements: ["cite-local-sources", "respect-source-policy"]
  },
  {
    id: "reporter",
    domain: "report-quality",
    allowedTasks: ["check-report-structure", "flag-export-gaps"],
    requiredEvidence: ["case.reportMarkdown"],
    outputSchema: "ReporterAgentOutput",
    budget: { maxTaskMs: 1500, maxToolCalls: 0, maxMemoryItems: 4 },
    safetyRequirements: ["no-unsafe-procedure-copying"]
  },
  {
    id: "safetyReviewer",
    domain: "safety-review",
    allowedTasks: ["check-unsafe-content", "block-unsupported-recommendations"],
    requiredEvidence: ["case.reportMarkdown", "agent.results"],
    outputSchema: "SafetyReviewAgentOutput",
    budget: { maxTaskMs: 1500, maxToolCalls: 0, maxMemoryItems: 4 },
    safetyRequirements: ["block-offensive-content", "enforce-defensive-only-boundary"]
  },
  {
    id: "toolExecutor",
    domain: "tool-boundary-review",
    allowedTasks: ["summarize-sandboxed-tool-use"],
    requiredEvidence: ["tool.calls", "sandbox.runs"],
    outputSchema: "ToolExecutorAgentOutput",
    budget: { maxTaskMs: 2000, maxToolCalls: 1, maxMemoryItems: 4 },
    safetyRequirements: ["sandbox-required", "no-high-impact-action-execution"]
  }
].map((contract) => agentRoleContractSchema.parse(contract));

export function listAgentRoleContracts(): AgentRoleContract[] {
  return contracts;
}

export function getAgentRoleContract(roleId: AgentRoleId): AgentRoleContract {
  return contracts.find((contract) => contract.id === roleId) as AgentRoleContract;
}
