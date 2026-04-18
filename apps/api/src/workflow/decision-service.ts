import type { DecisionRecord, DecisionType } from "../schemas/workflow.schema";
import { nowIso } from "../utils/time";

export function buildDecisionRecord(input: {
  index: number;
  decisionType?: DecisionType;
  decision: string;
  rationale: string;
  approver: string;
  evidenceRefs?: string[];
}): DecisionRecord {
  return {
    id: `decision_${String(input.index).padStart(3, "0")}`,
    decisionType: input.decisionType ?? "note",
    decision: input.decision,
    rationale: input.rationale,
    approver: input.approver,
    evidenceRefs: input.evidenceRefs ?? [],
    timestamp: nowIso()
  };
}
