import type { CreateRiskExceptionInput, RiskException } from "../schemas/vulnerabilities.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function isRiskExceptionCurrent(exception: Pick<RiskException, "expiresAt">, at = nowIso()): boolean {
  return exception.expiresAt >= at;
}

export function buildRiskException(findingId: string, input: CreateRiskExceptionInput): RiskException {
  const createdAt = nowIso();
  return {
    id: createId("risk_exception"),
    findingId,
    acceptedRisk: input.acceptedRisk,
    approver: input.approver,
    expiresAt: input.expiresAt,
    compensatingControls: input.compensatingControls,
    status: input.expiresAt >= createdAt ? "active" : "expired",
    createdAt
  };
}
