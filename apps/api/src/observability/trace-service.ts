import type { TraceContext } from "../schemas/observability.schema";
import { createId } from "../utils/ids";

export function createTraceContext(input: {
  requestId: string;
  caseId?: string;
  parentSpanId?: string;
}): TraceContext {
  return {
    requestId: input.requestId,
    caseId: input.caseId,
    spanId: createId("span"),
    parentSpanId: input.parentSpanId
  };
}
