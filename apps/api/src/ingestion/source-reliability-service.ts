import type { EvidenceSourceRegistration, EvidenceSourceType } from "../schemas/ingestion.schema";

const typeDefaults: Record<EvidenceSourceType, number> = {
  dns: 0.78,
  proxy: 0.82,
  email_security: 0.8,
  siem: 0.84,
  edr: 0.86,
  identity: 0.85,
  cloud: 0.83,
  artifact: 0.7
};

export function defaultParserIdForSourceType(type: EvidenceSourceType): string {
  return `${type}-parser`;
}

export function reliabilityForSource(input: EvidenceSourceRegistration): number {
  if (input.reliabilityScore !== undefined) {
    return Math.min(1, Math.max(0, input.reliabilityScore));
  }

  return typeDefaults[input.type];
}
