import type { ChainOfCustodyEntry, ChainOfCustodyOperation } from "../schemas/ingestion.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function buildCustodyEntry(input: {
  evidenceId: string;
  sourceId: string;
  actor: string;
  operation: ChainOfCustodyOperation;
  inputHash?: string;
  outputHash?: string;
  details?: Record<string, unknown>;
}): ChainOfCustodyEntry {
  return {
    id: createId("custody"),
    evidenceId: input.evidenceId,
    sourceId: input.sourceId,
    actor: input.actor,
    operation: input.operation,
    timestamp: nowIso(),
    inputHash: input.inputHash,
    outputHash: input.outputHash,
    details: input.details ?? {}
  };
}
