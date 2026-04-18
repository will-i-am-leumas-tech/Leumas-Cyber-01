import type { AnalysisResult, Severity } from "../schemas/result.schema";
import type { InvestigationTask, WorkflowPriority } from "../schemas/workflow.schema";
import { nowIso } from "../utils/time";

function priorityFromSeverity(severity: Severity): WorkflowPriority {
  return severity;
}

function makeTask(index: number, input: Omit<InvestigationTask, "id" | "createdAt" | "updatedAt" | "status">): InvestigationTask {
  const timestamp = nowIso();
  return {
    id: `task_${String(index).padStart(3, "0")}`,
    status: "open",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input
  };
}

export function workflowPriorityFromResult(result?: AnalysisResult): WorkflowPriority {
  return result ? priorityFromSeverity(result.severity) : "low";
}

export function generateDefaultTasks(result: AnalysisResult): InvestigationTask[] {
  const linkedFindingIds = result.reasoning?.findings.map((finding) => finding.id) ?? [];
  const tasks: Array<Omit<InvestigationTask, "id" | "createdAt" | "updatedAt" | "status">> = [
    {
      title: "Preserve submitted evidence",
      description: "Keep the original alert, logs, normalized events, and report attached to the case.",
      priority: workflowPriorityFromResult(result),
      linkedFindingIds,
      required: true
    },
    {
      title: "Correlate related telemetry",
      description: "Review endpoint, identity, network, DNS, proxy, and cloud telemetry for the same time window.",
      priority: workflowPriorityFromResult(result),
      linkedFindingIds,
      required: true
    }
  ];

  if (result.category === "execution") {
    tasks.push(
      {
        title: "Collect parent-child process tree",
        description: "Confirm the initiating process, command line, user session, and related child processes.",
        priority: result.severity === "high" || result.severity === "critical" ? "high" : "medium",
        linkedFindingIds,
        required: true
      },
      {
        title: "Validate whether execution was authorized",
        description: "Check change records, administrator activity, and endpoint owner context.",
        priority: "medium",
        linkedFindingIds,
        required: true
      }
    );
  }

  if (result.category === "credential-access") {
    tasks.push(
      {
        title: "Review affected account risk",
        description: "Confirm MFA status, recent sign-ins, impossible travel, and password reset requirements.",
        priority: "high",
        linkedFindingIds,
        required: true
      },
      {
        title: "Identify source and target spread",
        description: "Search for additional failed-login bursts from the same source or against nearby accounts.",
        priority: "medium",
        linkedFindingIds,
        required: true
      }
    );
  }

  if (result.severity === "high" || result.severity === "critical") {
    tasks.push({
      title: "Review containment decision",
      description: "Document whether isolation, account control, or monitoring is appropriate before action.",
      priority: result.severity,
      linkedFindingIds,
      required: true
    });
  }

  return tasks.map((task, index) => makeTask(index + 1, task));
}
