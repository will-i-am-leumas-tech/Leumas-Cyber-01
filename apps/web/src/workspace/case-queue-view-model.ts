import type { CaseQueueItem, CaseState, Severity } from "../types";

export interface CaseQueueFilters {
  search: string;
  state: "" | CaseState;
  severity: "" | Severity;
  flags: string[];
}

export interface CaseQueueSummary {
  total: number;
  open: number;
  highPriority: number;
  overdue: number;
  pendingApprovals: number;
}

const severityRank: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export function summarizeCaseQueue(items: CaseQueueItem[]): CaseQueueSummary {
  return {
    total: items.length,
    open: items.filter((item) => item.state !== "closed").length,
    highPriority: items.filter((item) => item.priority === "critical" || item.priority === "high").length,
    overdue: items.filter((item) => item.slaStatus === "overdue").length,
    pendingApprovals: items.reduce((sum, item) => sum + item.approvalCount, 0)
  };
}

export function filterCaseQueue(items: CaseQueueItem[], filters: CaseQueueFilters): CaseQueueItem[] {
  const search = filters.search.trim().toLowerCase();
  return items
    .filter((item) => (filters.state ? item.state === filters.state : true))
    .filter((item) => (filters.severity ? item.severity === filters.severity : true))
    .filter((item) => filters.flags.every((flag) => item.flags.includes(flag)))
    .filter((item) => {
      if (!search) {
        return true;
      }
      return [item.caseId, item.title, item.owner, item.flags.join(" ")].join(" ").toLowerCase().includes(search);
    })
    .sort(
      (a, b) =>
        Number(b.slaStatus === "overdue") - Number(a.slaStatus === "overdue") ||
        severityRank[b.severity] - severityRank[a.severity] ||
        b.updatedAt.localeCompare(a.updatedAt)
    );
}
