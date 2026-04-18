import { buildDetectionIntentFromIntel } from "../detections/detection-intent-builder";
import type { DetectionIntent } from "../schemas/detections.schema";
import type { IntelDetectionInput, StixObjectRecord } from "../schemas/threat-intel-v2.schema";

export interface IntelDetectionResult {
  detectionIntent: DetectionIntent;
  citations: string[];
  warnings: string[];
}

export function buildIntelDetection(input: IntelDetectionInput, objects: StixObjectRecord[]): IntelDetectionResult {
  const indicators = input.indicatorIds
    .map((indicatorId) => objects.find((object) => object.id === indicatorId || object.stixId === indicatorId))
    .filter((object): object is StixObjectRecord => Boolean(object));
  const warnings =
    indicators.length === input.indicatorIds.length
      ? []
      : [`${input.indicatorIds.length - indicators.length} requested indicator reference did not match imported intelligence.`];

  return {
    detectionIntent: buildDetectionIntentFromIntel({
      indicators,
      severity: input.severity,
      dataSources: input.dataSources
    }),
    citations: indicators.map((indicator) => `intel:${indicator.sourceId}:${indicator.id}`),
    warnings
  };
}
