import type { ApprovalRequest } from "../schemas/actions.schema";
import { nowIso } from "../utils/time";

export function buildApprovalRequest(input: {
  index: number;
  actionPlanId: string;
  approverRole: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  decidedBy?: string;
}): ApprovalRequest {
  const timestamp = nowIso();
  return {
    id: `approval_${String(input.index).padStart(3, "0")}`,
    actionPlanId: input.actionPlanId,
    approverRole: input.approverRole,
    requestedBy: input.requestedBy,
    status: input.status,
    reason: input.reason,
    decidedBy: input.decidedBy,
    decidedAt: input.status === "pending" ? undefined : timestamp,
    createdAt: timestamp
  };
}
