import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ThreatIntelSource } from "../schemas/threat-intel.schema";
import { findProjectRoot } from "../utils/files";
import type { ReputationRecord } from "./enrichment-registry";

interface LocalReputationFixture {
  sources: ThreatIntelSource[];
  reputation: ReputationRecord[];
}

const defaultSources: ThreatIntelSource[] = [
  {
    id: "local-reputation",
    name: "Local Reputation",
    type: "local",
    trustTier: "internal",
    reliability: 0.9,
    terms: "Internal defensive use only.",
    enabled: true
  },
  {
    id: "community-feed",
    name: "Community Feed",
    type: "external",
    trustTier: "community",
    reliability: 0.55,
    terms: "Use for triage only; verify before enforcement.",
    enabled: true
  },
  {
    id: "internal-sightings",
    name: "Internal Sightings",
    type: "internal",
    trustTier: "internal",
    reliability: 0.85,
    terms: "Internal telemetry correlation.",
    enabled: true
  }
];

export async function loadLocalReputation(): Promise<LocalReputationFixture> {
  try {
    const raw = await readFile(path.join(findProjectRoot(), "data", "fixtures", "threat-intel", "local-reputation.json"), "utf8");
    const parsed = JSON.parse(raw) as LocalReputationFixture;
    return {
      sources: parsed.sources,
      reputation: parsed.reputation
    };
  } catch {
    return {
      sources: defaultSources,
      reputation: []
    };
  }
}
