import type { TimelineEvent } from "../schemas/result.schema";
import type { IngestionBundle, NormalizedEvent } from "../schemas/ingest.schema";
import type { AnalyzeInput } from "../schemas/input.schema";
import { buildArtifactsFromInput } from "./artifact-service";
import { parseArtifacts } from "./parser-registry";

export function buildIngestionBundle(input: AnalyzeInput): IngestionBundle {
  const artifactsWithContent = buildArtifactsFromInput(input);
  const parsed = parseArtifacts(artifactsWithContent);

  return {
    artifacts: artifactsWithContent.map((item) => item.artifact),
    normalizedEvents: parsed.events,
    entities: parsed.entities,
    parserWarnings: parsed.warnings
  };
}

export function timelineFromNormalizedEvents(events: NormalizedEvent[]): TimelineEvent[] {
  return events
    .filter((event) => Boolean(event.timestamp))
    .map((event) => ({
      timestamp: event.timestamp as string,
      label: [event.eventType, event.actor ? `actor=${event.actor}` : undefined, event.asset ? `asset=${event.asset}` : undefined]
        .filter(Boolean)
        .join(" "),
      source: event.source,
      raw: event.rawRef.excerpt
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
