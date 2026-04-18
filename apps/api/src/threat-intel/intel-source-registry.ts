import type { ThreatIntelSource } from "../schemas/threat-intel.schema";
import type { CreateIntelSourceInput, IntelSource } from "../schemas/threat-intel-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function buildIntelSource(input: CreateIntelSourceInput): IntelSource {
  return {
    id: input.id ?? createId("intel_source"),
    name: input.name,
    type: input.type,
    trustScore: input.trustScore,
    owner: input.owner,
    updateCadence: input.updateCadence,
    retentionDays: input.retentionDays,
    enabled: input.enabled,
    createdAt: nowIso()
  };
}

export function legacySourceFromIntelSource(source: IntelSource): ThreatIntelSource {
  return {
    id: source.id,
    name: source.name,
    type: source.type === "internal" ? "internal" : "external",
    trustTier: source.trustScore >= 0.85 ? "vendor" : "community",
    reliability: source.trustScore,
    terms: "Defensive intelligence use only; verify before enforcement.",
    enabled: source.enabled
  };
}

export function defaultIntelSources(): IntelSource[] {
  return [
    {
      id: "local-stix",
      name: "Local STIX Fixture Feed",
      type: "stix-file",
      trustScore: 0.82,
      owner: "intel",
      updateCadence: "manual",
      retentionDays: 90,
      enabled: true,
      createdAt: nowIso()
    },
    {
      id: "internal-prevalence",
      name: "Internal Prevalence",
      type: "internal",
      trustScore: 0.88,
      owner: "soc",
      updateCadence: "continuous",
      retentionDays: 30,
      enabled: true,
      createdAt: nowIso()
    }
  ];
}
