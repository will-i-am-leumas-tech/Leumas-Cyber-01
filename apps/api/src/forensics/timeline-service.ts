import type { EndpointEvent, ForensicTimelineEvent } from "../schemas/endpoint.schema";
import { createId } from "../utils/ids";

export function buildForensicTimeline(events: EndpointEvent[], caseId: string): ForensicTimelineEvent[] {
  return events
    .map((event) => ({
      id: createId("forensic_timeline"),
      caseId,
      timestamp: event.timestamp,
      host: event.host,
      actor: event.user,
      eventType: event.eventType,
      sourceRef: event.sourceRef,
      processGuid: event.processGuid,
      summary: `${event.image}${event.parentImage ? ` launched by ${event.parentImage}` : ""}`
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
