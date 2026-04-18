import type { AnalysisResult } from "../schemas/result.schema";
import type { Observation } from "../schemas/reasoning.schema";

type AnalysisForReasoning = Omit<AnalysisResult, "reportMarkdown" | "reasoning">;

function makeObservationId(index: number): string {
  return `observation_${String(index + 1).padStart(3, "0")}`;
}

function confidenceForEvidence(result: AnalysisForReasoning): number {
  if (result.evidence.length === 0) {
    return Math.max(0.25, result.confidence - 0.35);
  }

  return Math.max(0.35, Math.min(0.98, result.confidence));
}

export function buildObservations(result: AnalysisForReasoning): Observation[] {
  const observations: Observation[] = [];

  for (const [index, evidence] of result.evidence.entries()) {
    observations.push({
      id: makeObservationId(observations.length),
      type: evidence.toLowerCase().startsWith("no high-confidence") ? "unknown" : "fact",
      value: evidence,
      confidence: confidenceForEvidence(result),
      sourceRef: {
        id: `source_evidence_${index + 1}`,
        type: "adapter",
        locator: `evidence[${index}]`,
        excerpt: evidence
      },
      entityRefs: []
    });
  }

  for (const [index, event] of result.timeline.entries()) {
    observations.push({
      id: makeObservationId(observations.length),
      type: "timeline_event",
      value: event.label,
      confidence: 0.9,
      timestamp: event.timestamp,
      sourceRef: {
        id: `source_timeline_${index + 1}`,
        type: "timeline",
        locator: `timeline[${index}]`,
        excerpt: event.raw ?? event.label
      },
      entityRefs: []
    });
  }

  for (const [index, indicator] of result.indicators.entries()) {
    observations.push({
      id: makeObservationId(observations.length),
      type: "indicator",
      value: `${indicator.type}: ${indicator.normalized}`,
      confidence: 0.92,
      sourceRef: {
        id: `source_indicator_${index + 1}`,
        type: "indicator",
        locator: `indicators[${index}]`,
        excerpt: indicator.value
      },
      entityRefs: [`${indicator.type}:${indicator.normalized}`]
    });
  }

  for (const [index, note] of result.notes.entries()) {
    observations.push({
      id: makeObservationId(observations.length),
      type: "analyst_note",
      value: note,
      confidence: 0.7,
      sourceRef: {
        id: `source_note_${index + 1}`,
        type: "adapter",
        locator: `notes[${index}]`,
        excerpt: note
      },
      entityRefs: []
    });
  }

  return observations;
}
