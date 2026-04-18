import type { CyberCase } from "../../schemas/case.schema";

export function runParserAgent(cyberCase: CyberCase): Record<string, unknown> {
  const ingestion = cyberCase.result?.ingestion;
  return {
    artifactCount: ingestion?.artifacts.length ?? 0,
    eventCount: ingestion?.normalizedEvents.length ?? 0,
    entityCount: ingestion?.entities.length ?? 0,
    parserWarningCount: ingestion?.parserWarnings.length ?? 0
  };
}
