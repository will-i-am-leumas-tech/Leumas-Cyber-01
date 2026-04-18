import type { ApprovalQueueItem } from "../types";

export interface ApprovalLane {
  status: ApprovalQueueItem["status"];
  label: string;
  items: ApprovalQueueItem[];
}

const approvalLanes: Array<{ status: ApprovalQueueItem["status"]; label: string }> = [
  { status: "pending", label: "Pending" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Rejected" },
  { status: "blocked", label: "Blocked" }
];

export function groupApprovalsByStatus(items: ApprovalQueueItem[]): ApprovalLane[] {
  return approvalLanes.map((lane) => ({
    ...lane,
    items: items
      .filter((item) => item.status === lane.status)
      .sort((a, b) => b.risk.localeCompare(a.risk) || b.createdAt.localeCompare(a.createdAt))
  }));
}

export function pendingApprovalCount(items: ApprovalQueueItem[]): number {
  return items.filter((item) => item.status === "pending").length;
}
