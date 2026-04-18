import type { CloudEvent } from "../schemas/cloud-security.schema";

export function summarizeAuthAnomalies(events: CloudEvent[]): string[] {
  return events
    .filter((event) => event.riskSignals.some((signal) => signal.startsWith("risky_signin")) || event.result === "failure")
    .map((event) => {
      const signals = event.riskSignals.length > 0 ? event.riskSignals.join(", ") : event.result;
      return `${event.timestamp} ${event.actor} ${event.action} from ${event.sourceIp ?? "unknown ip"}: ${signals}`;
    });
}
