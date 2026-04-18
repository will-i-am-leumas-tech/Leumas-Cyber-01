import type { ArbitrationResult, AgentResult, AgentRoleId, AgentTask, OrchestrationRun } from "../schemas/agents.schema";
import type { AgentMemoryItem, AgentTrace, ArbitrationV2Result, ReviewerFinding } from "../schemas/agents-v2.schema";
import type { CyberCase } from "../schemas/case.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { arbitrateAgentResults } from "./arbitration-service";
import { buildAgentMemory } from "./agent-memory-service";
import { evaluateAgentBudget, statusFromBudget } from "./agent-budget-service";
import { buildAgentTrace } from "./agent-trace-service";
import { buildAgentTask, buildOrchestrationRun, standardAgentRoles } from "./agent-task-service";
import { runReviewerAgent } from "./reviewer-agent";
import { validateAgentOutput } from "./result-validator";
import { runInvestigatorAgent } from "./roles/investigator.agent";
import { runParserAgent } from "./roles/parser.agent";
import { runReporterAgent } from "./roles/reporter.agent";
import { runRetrieverAgent } from "./roles/retriever.agent";
import { runSafetyReviewerAgent } from "./roles/safety-reviewer.agent";
import { runToolExecutorAgent } from "./roles/tool-executor.agent";

interface OrchestrationOutcome {
  run: OrchestrationRun;
  tasks: AgentTask[];
  results: AgentResult[];
  arbitration: ArbitrationResult;
  traces: AgentTrace[];
  memoryItems: AgentMemoryItem[];
  reviewerFinding: ReviewerFinding;
  arbitrationV2: ArbitrationV2Result;
}

function inputRefsForRole(cyberCase: CyberCase, role: AgentRoleId): string[] {
  const refs: string[] = ["case:summary"];
  if (role === "parser") {
    refs.push(...(cyberCase.result?.ingestion?.artifacts.map((artifact) => artifact.id) ?? []));
  }
  if (role === "investigator") {
    refs.push(...(cyberCase.result?.reasoning?.observations.map((observation) => observation.id) ?? []));
  }
  if (role === "retriever") {
    refs.push(...(cyberCase.result?.knowledge?.results.map((result) => result.chunkId) ?? []));
  }
  if (role === "reporter" || role === "safetyReviewer") {
    refs.push("case:report");
  }
  if (role === "toolExecutor") {
    refs.push(...cyberCase.toolCalls.map((toolCall) => toolCall.id));
  }
  return [...new Set(refs)];
}

function executeRole(role: AgentRoleId, cyberCase: CyberCase): Record<string, unknown> {
  switch (role) {
    case "parser":
      return runParserAgent(cyberCase);
    case "investigator":
      return runInvestigatorAgent(cyberCase);
    case "retriever":
      return runRetrieverAgent(cyberCase);
    case "reporter":
      return runReporterAgent(cyberCase);
    case "safetyReviewer":
      return runSafetyReviewerAgent(cyberCase);
    case "toolExecutor":
      return runToolExecutorAgent(cyberCase);
    default: {
      const exhaustive: never = role;
      throw new Error(`Unsupported agent role: ${exhaustive}`);
    }
  }
}

function buildAgentResult(task: AgentTask, output: Record<string, unknown>): AgentResult {
  const validation = validateAgentOutput(task.role, output);
  return {
    id: createId("agent_result"),
    taskId: task.id,
    role: task.role,
    output,
    validationStatus: validation.valid ? "passed" : "failed",
    confidence: validation.valid ? 0.86 : 0.2,
    warnings: validation.warnings,
    createdAt: nowIso()
  };
}

function buildArbitrationResult(runId: string, cyberCase: CyberCase, results: AgentResult[]): ArbitrationResult {
  const failedRoles = results.filter((result) => result.validationStatus === "failed").map((result) => result.role);
  const safety = results.find((result) => result.role === "safetyReviewer");
  const safetyAllowed = safety?.output.allowed !== false;
  const conflicts = [
    ...failedRoles.map((role) => `Agent ${role} produced invalid output.`),
    ...(safetyAllowed ? [] : ["Safety reviewer blocked final output."])
  ];

  return {
    id: createId("arbitration"),
    runId,
    selectedFindingIds: cyberCase.result?.reasoning?.findings.map((finding) => finding.id) ?? [],
    conflicts,
    reviewerNotes:
      conflicts.length === 0
        ? "All deterministic agent outputs validated and existing case findings were selected."
        : "One or more agent outputs require analyst review before promotion.",
    validationStatus: conflicts.length === 0 ? "passed" : "failed",
    createdAt: nowIso()
  };
}

export function createStandardOrchestration(cyberCase: CyberCase, plan = "standard-log-plan"): OrchestrationOutcome {
  const run = buildOrchestrationRun(cyberCase.id, plan);
  run.finalStatus = "running";
  const tasks = standardAgentRoles().map((role, index) =>
    buildAgentTask({
      caseId: cyberCase.id,
      runId: run.id,
      role,
      inputArtifactRefs: inputRefsForRole(cyberCase, role),
      index: index + 1
    })
  );
  run.taskIds = tasks.map((task) => task.id);

  const results: AgentResult[] = [];
  const traces: AgentTrace[] = [];
  for (const task of tasks) {
    const startedMs = Date.now();
    const startedAt = nowIso();
    task.status = "running";
    task.updatedAt = nowIso();
    const output = executeRole(task.role, cyberCase);
    const result = buildAgentResult(task, output);
    task.status = result.validationStatus === "passed" ? "completed" : "failed";
    if (task.role === "safetyReviewer" && output.allowed === false) {
      task.status = "blocked";
    }
    const completedAt = nowIso();
    const budgetDecision = evaluateAgentBudget({
      role: task.role,
      durationMs: Date.now() - startedMs,
      toolCallCount: task.role === "toolExecutor" ? cyberCase.toolCalls.length : 0,
      memoryItemCount: cyberCase.agentMemoryItems.length
    });
    task.status = statusFromBudget(task.status, budgetDecision);
    task.updatedAt = nowIso();
    results.push(result);
    traces.push(
      buildAgentTrace({
        task,
        result,
        startedAt,
        completedAt,
        durationMs: Date.now() - startedMs,
        toolRefs: task.role === "toolExecutor" ? cyberCase.toolCalls.map((toolCall) => toolCall.id) : [],
        policyDecisions: [budgetDecision.reason]
      })
    );
  }

  const arbitration = buildArbitrationResult(run.id, cyberCase, results);
  const memoryItems = buildAgentMemory(cyberCase);
  const reviewerFinding = runReviewerAgent({ cyberCase, runId: run.id, results });
  const arbitrationV2 = arbitrateAgentResults({ cyberCase, runId: run.id, results, reviewer: reviewerFinding });
  run.finalStatus = arbitration.validationStatus === "passed" && arbitrationV2.reviewerStatus === "passed" ? "completed" : "blocked";
  run.completedAt = nowIso();

  return {
    run,
    tasks,
    results,
    arbitration,
    traces,
    memoryItems,
    reviewerFinding,
    arbitrationV2
  };
}
