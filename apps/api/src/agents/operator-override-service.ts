import type { CreateOperatorOverrideInput, OperatorOverride } from "../schemas/agents-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function buildOperatorOverride(caseId: string, input: CreateOperatorOverrideInput): OperatorOverride {
  return {
    id: createId("operator_override"),
    caseId,
    actor: input.actor,
    decision: input.decision,
    reason: input.reason,
    affectedFindingIds: input.affectedFindingIds,
    timestamp: nowIso()
  };
}
