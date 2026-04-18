import type { AnalysisResult } from "../schemas/result.schema";
import type { Observation } from "../schemas/reasoning.schema";
import type { TechniqueMapping } from "../schemas/reasoning-v2.schema";

const mappings: Record<string, { tactic: string; techniqueId: string; techniqueName: string }> = {
  execution: {
    tactic: "Execution",
    techniqueId: "T1059",
    techniqueName: "Command and Scripting Interpreter"
  },
  "credential-access": {
    tactic: "Credential Access",
    techniqueId: "T1110",
    techniqueName: "Brute Force"
  },
  "defense-evasion": {
    tactic: "Defense Evasion",
    techniqueId: "T1562",
    techniqueName: "Impair Defenses"
  },
  "indicator-review": {
    tactic: "Discovery",
    techniqueId: "T1595",
    techniqueName: "Active Scanning"
  },
  hardening: {
    tactic: "Defensive Hardening",
    techniqueId: "DEF-HARDENING",
    techniqueName: "Preventive Control Improvement"
  }
};

export function mapAttackTechniques(result: AnalysisResult, observations: Observation[]): TechniqueMapping[] {
  const mapping = mappings[result.category];
  const evidenceObservationIds = observations
    .filter((observation) => observation.type === "fact" || observation.type === "timeline_event")
    .map((observation) => observation.id);

  if (!mapping || evidenceObservationIds.length === 0) {
    return [];
  }

  return [
    {
      id: "technique_mapping_001",
      framework: "MITRE ATT&CK",
      tactic: mapping.tactic,
      techniqueId: mapping.techniqueId,
      techniqueName: mapping.techniqueName,
      evidenceObservationIds,
      confidence: Math.max(0.35, Math.min(0.95, result.confidence))
    }
  ];
}
