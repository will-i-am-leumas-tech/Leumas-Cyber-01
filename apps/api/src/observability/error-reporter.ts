import type { ErrorEvent } from "../schemas/observability.schema";
import { detectSensitiveData } from "../privacy/sensitive-data-detector";
import { sanitizeForLog } from "../privacy/secure-logger";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export class ErrorReporter {
  private readonly events: ErrorEvent[] = [];

  report(input: {
    error: unknown;
    component: string;
    requestId: string;
    severity?: ErrorEvent["severity"];
  }): ErrorEvent {
    const raw = input.error instanceof Error ? input.error.message : String(input.error);
    const findings = detectSensitiveData(raw, `error:${input.component}`);
    const event: ErrorEvent = {
      id: createId("error_event"),
      component: input.component,
      severity: input.severity ?? "error",
      sanitizedError: sanitizeForLog(raw, findings),
      requestId: input.requestId,
      timestamp: nowIso()
    };
    this.events.push(event);
    return event;
  }

  list(): ErrorEvent[] {
    return [...this.events];
  }
}
