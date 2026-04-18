import type { CyberCase } from "../schemas/case.schema";
import type { ApprovalQueueItem, CaseQueueItem, DashboardMetric } from "../schemas/collaboration.schema";
import type { SandboxRun } from "../schemas/sandbox.schema";

function openTaskCount(cyberCase: CyberCase): number {
  return cyberCase.tasks.filter((task) => task.status !== "done" && task.status !== "cancelled").length;
}

function hasOverdueTask(cyberCase: CyberCase, now = new Date()): boolean {
  return cyberCase.tasks.some((task) => {
    if (!task.dueAt || task.status === "done" || task.status === "cancelled") {
      return false;
    }
    const dueAt = Date.parse(task.dueAt);
    return Number.isFinite(dueAt) && dueAt < now.getTime();
  });
}

function caseFlags(cyberCase: CyberCase, now = new Date()): string[] {
  return [
    cyberCase.refusal ? "refusal" : undefined,
    cyberCase.safetyDecisions.some((decision) => !decision.allowed) ? "safety_blocked" : undefined,
    cyberCase.promptInjectionFindings.length > 0 ? "prompt_injection" : undefined,
    cyberCase.approvalRequests.some((approval) => approval.status === "pending") ? "approval_pending" : undefined,
    cyberCase.result?.knowledge?.results.some((result) => result.citation.stale) ? "stale_knowledge" : undefined,
    cyberCase.groundingFindings.some((finding) => finding.status !== "supported") ? "grounding_review" : undefined,
    hasOverdueTask(cyberCase, now) ? "overdue_task" : undefined
  ].filter((flag): flag is string => Boolean(flag));
}

function slaStatus(cyberCase: CyberCase, now = new Date()): CaseQueueItem["slaStatus"] {
  if (hasOverdueTask(cyberCase, now)) {
    return "overdue";
  }
  return cyberCase.severity === "critical" || cyberCase.severity === "high" || openTaskCount(cyberCase) > 0 ? "watch" : "ok";
}

export function buildCaseQueueItem(cyberCase: CyberCase, now = new Date()): CaseQueueItem {
  return {
    caseId: cyberCase.id,
    title: cyberCase.title,
    severity: cyberCase.severity,
    priority: cyberCase.priority,
    state: cyberCase.state,
    owner: cyberCase.assignedTo,
    slaStatus: slaStatus(cyberCase, now),
    flags: caseFlags(cyberCase, now),
    updatedAt: cyberCase.updatedAt,
    openTaskCount: openTaskCount(cyberCase),
    approvalCount: cyberCase.approvalRequests.filter((approval) => approval.status === "pending").length,
    noteCount: cyberCase.analystNotes.length,
    safetyDecisionCount: cyberCase.safetyDecisions.length
  };
}

function sandboxApprovalStatus(run: SandboxRun): ApprovalQueueItem["status"] {
  if (run.status === "completed") {
    return "approved";
  }
  if (run.status === "denied" || run.status === "failed" || run.status === "timed_out") {
    return "blocked";
  }
  return "pending";
}

export function buildApprovalQueueItems(cases: CyberCase[]): ApprovalQueueItem[] {
  return cases
    .flatMap((cyberCase) => [
      ...cyberCase.approvalRequests.map((approval) => {
        const plan = cyberCase.actionPlans.find((candidate) => candidate.id === approval.actionPlanId);
        return {
          id: approval.id,
          caseId: cyberCase.id,
          title: plan?.objective ?? cyberCase.title,
          sourceType: "action" as const,
          targetId: approval.actionPlanId,
          risk: plan?.risk ?? "medium",
          status: approval.status,
          approver: approval.decidedBy ?? approval.approverRole,
          reason: approval.reason,
          createdAt: approval.createdAt
        };
      }),
      ...cyberCase.sandboxRuns
        .filter((run) => run.policyDecision.approvalRequired)
        .map((run) => ({
          id: `${run.id}:approval`,
          caseId: cyberCase.id,
          title: `Sandbox run for ${run.manifestId}`,
          sourceType: "sandbox" as const,
          targetId: run.id,
          risk: "medium" as const,
          status: sandboxApprovalStatus(run),
          approver: run.approvalId,
          reason: run.policyDecision.reason,
          createdAt: run.startedAt
        }))
    ])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function buildCaseFlowMetrics(cases: CyberCase[], window = "current"): DashboardMetric[] {
  const openCases = cases.filter((cyberCase) => cyberCase.state !== "closed");
  const blockedSafety = cases.filter((cyberCase) => cyberCase.safetyDecisions.some((decision) => !decision.allowed));
  const weakGrounding = cases.filter((cyberCase) => cyberCase.groundingFindings.some((finding) => finding.status !== "supported"));

  return [
    { name: "cases_total", value: cases.length, labels: {}, window },
    { name: "cases_open", value: openCases.length, labels: {}, window },
    { name: "safety_blocked_cases", value: blockedSafety.length, labels: {}, window },
    { name: "grounding_review_cases", value: weakGrounding.length, labels: {}, window }
  ];
}
